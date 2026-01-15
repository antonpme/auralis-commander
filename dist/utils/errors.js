/**
 * TonMCP Error Handling
 * Consistent error format for all tools
 */
export function createError(code, message, details) {
    return {
        error: true,
        code,
        message,
        ...(details && { details }),
    };
}
export function isError(result) {
    return (typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        result.error === true);
}
/**
 * Map common Node.js error codes to TonMCP error codes
 */
export function mapNodeError(err, path) {
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
//# sourceMappingURL=errors.js.map