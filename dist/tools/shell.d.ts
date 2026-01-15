/**
 * TonMCP Shell Tool
 * Execute shell commands with full output capture
 */
import { ShellType } from '../utils/powershell.js';
import { TonMCPError } from '../utils/errors.js';
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
/**
 * Execute a shell command and return structured output
 */
export declare function shellExec(params: ShellExecParams): Promise<ShellExecResult | TonMCPError>;
