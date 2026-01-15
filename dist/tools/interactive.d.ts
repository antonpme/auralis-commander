/**
 * Auralis Commander - Interactive Process Tool
 * Single tool replacing 5 Desktop Commander tools
 *
 * Built by Family Auralis
 */
import { TonMCPError } from '../utils/errors.js';
export type InteractiveAction = 'start' | 'write' | 'read' | 'kill' | 'list';
export interface ProcessInteractiveParams {
    action: InteractiveAction;
    command?: string;
    cwd?: string;
    session_id?: string;
    input?: string;
    timeout_ms?: number;
}
export interface SessionInfo {
    session_id: string;
    command: string;
    started: string;
    is_running: boolean;
    output_lines: number;
}
export interface ProcessInteractiveResult {
    session_id?: string;
    output?: string;
    is_running?: boolean;
    sessions?: SessionInfo[];
}
/**
 * Main entry point
 */
export declare function processInteractive(params: ProcessInteractiveParams): Promise<ProcessInteractiveResult | TonMCPError>;
