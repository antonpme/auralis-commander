/**
 * TonMCP Process Tools
 * List and kill processes using CIM/WMI
 */
import { TonMCPError } from '../utils/errors.js';
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
export declare function processes(params: ProcessesParams): Promise<ProcessesResult | TonMCPError>;
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
export declare function processKill(params: ProcessKillParams): Promise<ProcessKillResult | TonMCPError>;
