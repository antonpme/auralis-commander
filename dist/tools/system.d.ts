/**
 * TonMCP System Info Tool
 * System stats: CPU, memory, disks, uptime
 */
import { TonMCPError } from '../utils/errors.js';
export interface SystemInfoResult {
    hostname: string;
    os: string;
    uptime_hours: number;
    cpu: {
        name: string;
        cores: number;
        usage_percent: number;
    };
    memory: {
        total_gb: number;
        used_gb: number;
        percent: number;
    };
    disks: Array<{
        name: string;
        total_gb: number;
        free_gb: number;
        percent_used: number;
    }>;
}
export declare function systemInfo(): Promise<SystemInfoResult | TonMCPError>;
