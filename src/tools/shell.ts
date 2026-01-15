/**
 * TonMCP Shell Tool
 * Execute shell commands with full output capture
 */

import { execute, ShellType, ExecuteResult } from '../utils/powershell.js';
import { normalizePath, getHomeDir } from '../utils/paths.js';
import { isError, TonMCPError } from '../utils/errors.js';
import { getConfig } from '../config.js';

export interface ShellExecParams {
  command: string;
  shell?: ShellType;
  cwd?: string;
  timeout_ms?: number;
}

export interface ShellExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Execute a shell command and return structured output
 */
export async function shellExec(
  params: ShellExecParams
): Promise<ShellExecResult | TonMCPError> {
  const { command, timeout_ms } = params;
  
  // Get shell - use param, then config default, then 'pwsh'
  const shell = params.shell || getConfig('default_shell') || 'pwsh';
  
  // Get working directory - use param, then config default, then home
  const cwd = params.cwd 
    ? normalizePath(params.cwd) 
    : getConfig('default_cwd') || getHomeDir();

  const timeout = timeout_ms || DEFAULT_TIMEOUT_MS;

  const result = await execute(command, {
    shell,
    cwd,
    timeoutMs: timeout,
  });

  // If we got an error from execute, return it directly
  if (isError(result)) {
    return result;
  }

  // Otherwise, format the successful result
  const execResult = result as ExecuteResult;
  return {
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    exit_code: execResult.exitCode,
    duration_ms: execResult.durationMs,
  };
}
