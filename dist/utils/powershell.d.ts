/**
 * TonMCP PowerShell Wrapper
 * Safe execution of PowerShell commands with proper output handling
 */
import { TonMCPError } from './errors.js';
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
/**
 * Execute a shell command with timeout and proper output capture
 */
export declare function execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult | TonMCPError>;
/**
 * Execute a PowerShell command and parse JSON output
 * Wraps command to output JSON for structured data
 */
export declare function executeJson<T>(command: string, options?: ExecuteOptions): Promise<T | TonMCPError>;
/**
 * Check if a command/tool is available
 */
export declare function isCommandAvailable(command: string): Promise<boolean>;
