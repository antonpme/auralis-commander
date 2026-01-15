/**
 * TonMCP Configuration
 * Loads optional config from ~/.tonmcp.json
 */
export interface TonMCPConfig {
    default_shell: 'pwsh' | 'powershell' | 'cmd';
    default_cwd: string;
    search_tool: 'ripgrep' | 'powershell';
    max_file_read_mb: number;
    max_search_results: number;
}
/**
 * Load configuration from ~/.tonmcp.json
 * Falls back to defaults if file doesn't exist or is invalid
 */
export declare function loadConfig(): TonMCPConfig;
/**
 * Get a specific config value
 */
export declare function getConfig<K extends keyof TonMCPConfig>(key: K): TonMCPConfig[K];
/**
 * Reset config cache (useful for testing)
 */
export declare function resetConfigCache(): void;
