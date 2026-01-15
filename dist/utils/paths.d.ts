/**
 * TonMCP Path Utilities
 * Windows-native path handling
 */
/**
 * Normalize a path for Windows:
 * - Expand environment variables
 * - Resolve to absolute path
 * - Normalize slashes
 */
export declare function normalizePath(inputPath: string, cwd?: string): string;
/**
 * Get user home directory
 */
export declare function getHomeDir(): string;
/**
 * Check if path is absolute
 */
export declare function isAbsolutePath(inputPath: string): boolean;
/**
 * Join paths safely
 */
export declare function joinPaths(...paths: string[]): string;
/**
 * Get directory name from path
 */
export declare function getDirName(inputPath: string): string;
/**
 * Get base name from path
 */
export declare function getBaseName(inputPath: string): string;
/**
 * Get file extension
 */
export declare function getExtension(inputPath: string): string;
/**
 * Format bytes to human-readable size
 */
export declare function formatBytes(bytes: number): string;
