/**
 * TonMCP Error Handling
 * Consistent error format for all tools
 */
export type ErrorCode = 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'TIMEOUT' | 'INVALID_PATH' | 'COMMAND_FAILED' | 'PARSE_ERROR' | 'INVALID_ARGUMENT' | 'NOT_A_DIRECTORY' | 'NOT_A_FILE' | 'ALREADY_EXISTS' | 'TEXT_NOT_FOUND' | 'PROCESS_NOT_FOUND' | 'UNKNOWN_ERROR';
export interface TonMCPError {
    error: true;
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
export declare function createError(code: ErrorCode, message: string, details?: Record<string, unknown>): TonMCPError;
export declare function isError(result: unknown): result is TonMCPError;
/**
 * Map common Node.js error codes to TonMCP error codes
 */
export declare function mapNodeError(err: NodeJS.ErrnoException, path?: string): TonMCPError;
