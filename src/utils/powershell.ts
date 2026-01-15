/**
 * TonMCP PowerShell Wrapper
 * Safe execution of PowerShell commands with proper output handling
 */

import { spawn } from 'child_process';
import { createError, TonMCPError } from './errors.js';

export type ShellType = 'pwsh' | 'powershell' | 'cmd';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface ExecuteOptions {
  shell?: ShellType;
  cwd?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Get the shell executable path
 */
function getShellExecutable(shell: ShellType): string {
  switch (shell) {
    case 'pwsh':
      return 'pwsh';
    case 'powershell':
      return 'powershell';
    case 'cmd':
      return 'cmd';
    default:
      return 'pwsh';
  }
}

/**
 * Build command arguments for the shell
 */
function buildArgs(shell: ShellType, command: string): string[] {
  switch (shell) {
    case 'pwsh':
    case 'powershell':
      return [
        '-NoProfile',
        '-NonInteractive',
        '-OutputFormat', 'Text',
        '-Command', command,
      ];
    case 'cmd':
      return ['/c', command];
    default:
      return ['-NoProfile', '-NonInteractive', '-Command', command];
  }
}

/**
 * Execute a shell command with timeout and proper output capture
 */
export function execute(
  command: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult | TonMCPError> {
  const shell = options.shell || 'powershell';
  const cwd = options.cwd || process.cwd();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const executable = getShellExecutable(shell);
  const args = buildArgs(shell, command);

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn(executable, args, {
      cwd,
      env: process.env,
      windowsHide: true,
      // Use UTF-8 encoding
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Set up timeout
    const timeout = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      // Force kill after 1 second if still running
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 1000);
    }, timeoutMs);

    // Collect stdout
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data: string) => {
      stdout += data;
    });

    // Collect stderr
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data: string) => {
      stderr += data;
    });

    // Handle process exit
    child.on('close', (code) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      if (killed) {
        resolve(
          createError('TIMEOUT', `Command timed out after ${timeoutMs}ms`, {
            command,
            partialStdout: stdout.slice(0, 1000),
            partialStderr: stderr.slice(0, 1000),
          })
        );
        return;
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
        durationMs,
      });
    });

    // Handle spawn errors
    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve(
        createError('COMMAND_FAILED', `Failed to execute command: ${err.message}`, {
          command,
          shell,
        })
      );
    });
  });
}

/**
 * Execute a PowerShell command and parse JSON output
 * Wraps command to output JSON for structured data
 */
export async function executeJson<T>(
  command: string,
  options: ExecuteOptions = {}
): Promise<T | TonMCPError> {
  // Wrap command to convert output to JSON
  const jsonCommand = `${command} | ConvertTo-Json -Depth 10 -Compress`;
  
  const result = await execute(jsonCommand, options);
  
  if ('error' in result) {
    return result;
  }

  if (result.exitCode !== 0) {
    return createError('COMMAND_FAILED', result.stderr || 'Command failed', {
      exitCode: result.exitCode,
      stdout: result.stdout,
    });
  }

  try {
    // Handle empty output
    if (!result.stdout.trim()) {
      return [] as unknown as T;
    }
    return JSON.parse(result.stdout) as T;
  } catch {
    return createError('PARSE_ERROR', 'Failed to parse JSON output', {
      output: result.stdout.slice(0, 500),
    });
  }
}

/**
 * Check if a command/tool is available
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  const result = await execute(`Get-Command ${command} -ErrorAction SilentlyContinue`, {
    shell: 'powershell',
    timeoutMs: 5000,
  });

  if ('error' in result) {
    return false;
  }

  return result.exitCode === 0 && result.stdout.length > 0;
}
