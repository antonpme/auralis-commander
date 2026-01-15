/**
 * TonMCP Path Utilities
 * Windows-native path handling
 */
import * as path from 'path';
import * as os from 'os';
/**
 * Normalize a path for Windows:
 * - Expand environment variables
 * - Resolve to absolute path
 * - Normalize slashes
 */
export function normalizePath(inputPath, cwd) {
    let result = inputPath;
    // Expand environment variables (Windows style: %VAR%)
    result = result.replace(/%([^%]+)%/g, (_, varName) => {
        return process.env[varName] || '';
    });
    // Expand ~ to user home
    if (result.startsWith('~')) {
        result = path.join(os.homedir(), result.slice(1));
    }
    // Resolve to absolute path
    if (!path.isAbsolute(result)) {
        result = path.resolve(cwd || process.cwd(), result);
    }
    // Normalize the path (handles .. and .)
    result = path.normalize(result);
    return result;
}
/**
 * Get user home directory
 */
export function getHomeDir() {
    return os.homedir();
}
/**
 * Check if path is absolute
 */
export function isAbsolutePath(inputPath) {
    return path.isAbsolute(inputPath);
}
/**
 * Join paths safely
 */
export function joinPaths(...paths) {
    return path.join(...paths);
}
/**
 * Get directory name from path
 */
export function getDirName(inputPath) {
    return path.dirname(inputPath);
}
/**
 * Get base name from path
 */
export function getBaseName(inputPath) {
    return path.basename(inputPath);
}
/**
 * Get file extension
 */
export function getExtension(inputPath) {
    return path.extname(inputPath);
}
/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
//# sourceMappingURL=paths.js.map