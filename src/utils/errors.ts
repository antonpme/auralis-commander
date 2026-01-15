/**
 * TonMCP Error Handling
 * Consistent error format for all tools
 */

export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'INVALID_PATH'
  | 'COMMAND_FAILED'
  | 'PARSE_ERROR'
  | 'INVALID_ARGUMENT'
  | 'NOT_A_DIRECTORY'
  | 'NOT_A_FILE'
  | 'ALREADY_EXISTS'
  | 'TEXT_NOT_FOUND'
  | 'PROCESS_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface TonMCPError {
  error: true;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): TonMCPError {
  return {
    error: true,
    code,
    message,
    ...(details && { details }),
  };
}

export function isError(result: unknown): result is TonMCPError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    (result as TonMCPError).error === true
  );
}

/**
 * Map common Node.js error codes to TonMCP error codes
 */
export function mapNodeError(err: NodeJS.ErrnoException, path?: string): TonMCPError {
  const pathInfo = path ? `: ${path}` : '';
  
  switch (err.code) {
    case 'ENOENT':
      return createError('FILE_NOT_FOUND', `File or directory not found${pathInfo}`);
    case 'EACCES':
    case 'EPERM':
      return createError('PERMISSION_DENIED', `Permission denied${pathInfo}`);
    case 'ENOTDIR':
      return createError('NOT_A_DIRECTORY', `Not a directory${pathInfo}`);
    case 'EISDIR':
      return createError('NOT_A_FILE', `Is a directory${pathInfo}`);
    case 'EEXIST':
      return createError('ALREADY_EXISTS', `Already exists${pathInfo}`);
    case 'ETIMEDOUT':
      return createError('TIMEOUT', `Operation timed out${pathInfo}`);
    default:
      return createError('UNKNOWN_ERROR', err.message || `Unknown error${pathInfo}`, {
        originalCode: err.code,
      });
  }
}
