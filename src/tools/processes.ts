/**
 * TonMCP Process Tools
 * List and kill processes using CIM/WMI
 */

import { executeJson, execute } from '../utils/powershell.js';
import { createError, isError, TonMCPError } from '../utils/errors.js';

// ============================================================================
// processes
// ============================================================================

export interface ProcessesParams {
  sort_by?: 'memory' | 'cpu' | 'name' | 'pid';
  limit?: number;
  filter?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  memory_mb: number;
  cpu_percent: number;
  status: string;
  start_time: string | null;
}

export interface ProcessesResult {
  processes: ProcessInfo[];
  total_count: number;
}

interface RawProcessInfo {
  ProcessId: number;
  Name: string;
  WorkingSetSize: number;
  CreationDate: string | null;
}

interface RawCpuInfo {
  IDProcess: number;
  PercentProcessorTime: number;
}

export async function processes(
  params: ProcessesParams
): Promise<ProcessesResult | TonMCPError> {
  const sortBy = params.sort_by ?? 'memory';
  const limit = params.limit ?? 30;
  const filter = params.filter;

  // Get process list with working set (memory)
  let processCommand = `Get-CimInstance -ClassName Win32_Process | ` +
    `Select-Object ProcessId, Name, WorkingSetSize, CreationDate`;
  
  if (filter) {
    processCommand += ` | Where-Object { $_.Name -like "*${filter}*" }`;
  }

  const processResult = await executeJson<RawProcessInfo[]>(processCommand);
  
  if (isError(processResult)) {
    return processResult;
  }

  // Get CPU usage per process (this is a snapshot, not accurate for real-time)
  // Using Get-Counter is more accurate but slower
  const cpuCommand = `Get-CimInstance -ClassName Win32_PerfFormattedData_PerfProc_Process | ` +
    `Select-Object IDProcess, PercentProcessorTime`;
  
  const cpuResult = await executeJson<RawCpuInfo[]>(cpuCommand);
  
  // Build CPU lookup map (may fail on some systems, so we default to 0)
  const cpuMap = new Map<number, number>();
  if (!isError(cpuResult) && Array.isArray(cpuResult)) {
    for (const item of cpuResult) {
      if (item.IDProcess && item.PercentProcessorTime !== undefined) {
        cpuMap.set(item.IDProcess, item.PercentProcessorTime);
      }
    }
  }

  // Handle single result (PowerShell returns object instead of array)
  const rawProcesses = Array.isArray(processResult) ? processResult : [processResult];

  // Transform and aggregate
  const processList: ProcessInfo[] = rawProcesses
    .filter((p): p is RawProcessInfo => p !== null && p.ProcessId !== undefined)
    .map((p) => ({
      pid: p.ProcessId,
      name: p.Name || 'Unknown',
      memory_mb: Math.round((p.WorkingSetSize || 0) / (1024 * 1024) * 10) / 10,
      cpu_percent: cpuMap.get(p.ProcessId) ?? 0,
      status: 'running',
      start_time: p.CreationDate || null,
    }));

  // Sort
  const sortFn = (a: ProcessInfo, b: ProcessInfo): number => {
    switch (sortBy) {
      case 'memory':
        return b.memory_mb - a.memory_mb;
      case 'cpu':
        return b.cpu_percent - a.cpu_percent;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'pid':
        return a.pid - b.pid;
      default:
        return b.memory_mb - a.memory_mb;
    }
  };

  processList.sort(sortFn);

  // Limit results
  const limited = processList.slice(0, limit);

  return {
    processes: limited,
    total_count: processList.length,
  };
}

// ============================================================================
// process_kill
// ============================================================================

export interface ProcessKillParams {
  pid?: number;
  name?: string;
  force?: boolean;
}

export interface ProcessKillResult {
  killed: number[];
  failed: number[];
  count: number;
}

export async function processKill(
  params: ProcessKillParams
): Promise<ProcessKillResult | TonMCPError> {
  const { pid, name, force } = params;

  if (!pid && !name) {
    return createError('INVALID_ARGUMENT', 'Must specify either pid or name');
  }

  const killed: number[] = [];
  const failed: number[] = [];

  if (pid) {
    // Kill by PID
    const forceFlag = force ? '-Force' : '';
    const command = `Stop-Process -Id ${pid} ${forceFlag} -PassThru -ErrorAction Stop | Select-Object Id`;
    
    const result = await execute(command);
    
    if (isError(result)) {
      failed.push(pid);
    } else if (result.exitCode === 0) {
      killed.push(pid);
    } else {
      failed.push(pid);
    }
  } else if (name) {
    // Kill by name (all matching processes)
    const forceFlag = force ? '-Force' : '';
    
    // First get list of PIDs matching the name
    const listCommand = `Get-Process -Name "${name}" -ErrorAction SilentlyContinue | Select-Object Id | ConvertTo-Json -Compress`;
    const listResult = await execute(listCommand);
    
    if (isError(listResult)) {
      return createError('PROCESS_NOT_FOUND', `No processes found matching: ${name}`);
    }

    if (!listResult.stdout.trim()) {
      return createError('PROCESS_NOT_FOUND', `No processes found matching: ${name}`);
    }

    let pids: number[] = [];
    try {
      const parsed = JSON.parse(listResult.stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      pids = items.map((p: { Id: number }) => p.Id);
    } catch {
      return createError('PARSE_ERROR', 'Failed to parse process list');
    }

    // Kill each process
    for (const processPid of pids) {
      const killCommand = `Stop-Process -Id ${processPid} ${forceFlag} -ErrorAction SilentlyContinue`;
      const killResult = await execute(killCommand);
      
      if (!isError(killResult) && killResult.exitCode === 0) {
        killed.push(processPid);
      } else {
        failed.push(processPid);
      }
    }
  }

  return {
    killed,
    failed,
    count: killed.length,
  };
}
