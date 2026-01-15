/**
 * TonMCP Configuration
 * Loads optional config from ~/.tonmcp.json
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const DEFAULT_CONFIG = {
    default_shell: 'pwsh',
    default_cwd: os.homedir(),
    search_tool: 'ripgrep',
    max_file_read_mb: 10,
    max_search_results: 200,
};
let cachedConfig = null;
/**
 * Load configuration from ~/.tonmcp.json
 * Falls back to defaults if file doesn't exist or is invalid
 */
export function loadConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const configPath = path.join(os.homedir(), '.tonmcp.json');
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            const userConfig = JSON.parse(content);
            cachedConfig = {
                ...DEFAULT_CONFIG,
                ...userConfig,
            };
        }
        else {
            cachedConfig = { ...DEFAULT_CONFIG };
        }
    }
    catch {
        // Invalid JSON or read error - use defaults
        cachedConfig = { ...DEFAULT_CONFIG };
    }
    return cachedConfig;
}
/**
 * Get a specific config value
 */
export function getConfig(key) {
    return loadConfig()[key];
}
/**
 * Reset config cache (useful for testing)
 */
export function resetConfigCache() {
    cachedConfig = null;
}
//# sourceMappingURL=config.js.map