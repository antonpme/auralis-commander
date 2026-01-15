/**
 * TonMCP Search Tool
 * File and content search with ripgrep or PowerShell fallback
 */
import { execute, isCommandAvailable } from '../utils/powershell.js';
import { normalizePath } from '../utils/paths.js';
import { createError, isError } from '../utils/errors.js';
import { getConfig } from '../config.js';
let ripgrepAvailable = null;
/**
 * Check if ripgrep is available (cached)
 */
async function hasRipgrep() {
    if (ripgrepAvailable !== null) {
        return ripgrepAvailable;
    }
    // Check config preference first
    const configTool = getConfig('search_tool');
    if (configTool === 'powershell') {
        ripgrepAvailable = false;
        return false;
    }
    ripgrepAvailable = await isCommandAvailable('rg');
    return ripgrepAvailable;
}
/**
 * Search using ripgrep
 */
async function searchWithRipgrep(searchPath, pattern, type, filePattern, ignoreCase, maxResults) {
    let command;
    if (type === 'files') {
        // Search for files by name
        const caseFlag = ignoreCase ? '-i' : '';
        command = `rg --files "${searchPath}" | rg ${caseFlag} "${pattern}" | Select-Object -First ${maxResults}`;
    }
    else {
        // Search file contents
        const caseFlag = ignoreCase ? '-i' : '-s';
        const globFlag = filePattern !== '*' ? `-g "${filePattern}"` : '';
        command = `rg ${caseFlag} ${globFlag} -n -C 2 --json "${pattern}" "${searchPath}" | Select-Object -First ${maxResults * 10}`;
    }
    const result = await execute(command, { timeoutMs: 60000 });
    if (isError(result)) {
        return result;
    }
    const matches = [];
    if (type === 'files') {
        // Parse file list
        const lines = result.stdout.split('\n').filter(Boolean);
        for (const line of lines) {
            if (matches.length >= maxResults)
                break;
            const filePath = line.trim();
            const name = filePath.split(/[/\\]/).pop() || filePath;
            matches.push({
                path: filePath,
                name,
            });
        }
    }
    else {
        // Parse JSON output from ripgrep
        const lines = result.stdout.split('\n').filter(Boolean);
        let currentContext = [];
        for (const line of lines) {
            if (matches.length >= maxResults)
                break;
            try {
                const json = JSON.parse(line);
                if (json.type === 'match') {
                    const data = json.data;
                    matches.push({
                        path: data.path.text,
                        name: data.path.text.split(/[/\\]/).pop() || data.path.text,
                        match: data.lines.text.trim(),
                        line: data.line_number,
                        context: currentContext.join('\n'),
                    });
                    currentContext = [];
                }
                else if (json.type === 'context') {
                    currentContext.push(json.data.lines.text.trim());
                    if (currentContext.length > 4)
                        currentContext.shift();
                }
            }
            catch {
                // Skip non-JSON lines
            }
        }
    }
    return matches;
}
/**
 * Search using PowerShell (fallback)
 */
async function searchWithPowerShell(searchPath, pattern, type, filePattern, ignoreCase, maxResults) {
    let command;
    if (type === 'files') {
        // Search for files by name
        command = `Get-ChildItem -Path "${searchPath}" -Recurse -File -ErrorAction SilentlyContinue | ` +
            `Where-Object { $_.Name -${ignoreCase ? '' : 'c'}like "*${pattern}*" } | ` +
            `Select-Object -First ${maxResults} | ` +
            `ForEach-Object { @{ path = $_.FullName; name = $_.Name } } | ` +
            `ConvertTo-Json -Compress`;
    }
    else {
        // Search file contents
        const filterClause = filePattern !== '*'
            ? `-Include "${filePattern}"`
            : '';
        command = `Get-ChildItem -Path "${searchPath}" -Recurse -File ${filterClause} -ErrorAction SilentlyContinue | ` +
            `Select-String -Pattern "${pattern}" ${ignoreCase ? '' : '-CaseSensitive'} -Context 2,2 -ErrorAction SilentlyContinue | ` +
            `Select-Object -First ${maxResults} | ` +
            `ForEach-Object { @{ ` +
            `path = $_.Path; ` +
            `name = (Split-Path $_.Path -Leaf); ` +
            `match = $_.Line; ` +
            `line = $_.LineNumber; ` +
            `context = (($_.Context.PreContext + $_.Context.PostContext) -join [Environment]::NewLine) ` +
            `} } | ConvertTo-Json -Compress`;
    }
    const result = await execute(command, { timeoutMs: 60000 });
    if (isError(result)) {
        return result;
    }
    if (!result.stdout.trim()) {
        return [];
    }
    try {
        const parsed = JSON.parse(result.stdout);
        // PowerShell returns single object for one result, array for multiple
        const matches = Array.isArray(parsed) ? parsed : [parsed];
        return matches;
    }
    catch {
        return createError('PARSE_ERROR', 'Failed to parse search results', {
            output: result.stdout.slice(0, 500),
        });
    }
}
/**
 * Main search function
 */
export async function search(params) {
    const searchPath = normalizePath(params.path);
    const pattern = params.pattern;
    const type = params.type ?? 'files';
    const filePattern = params.file_pattern ?? '*';
    const ignoreCase = params.ignore_case ?? true;
    const maxResults = Math.min(params.max_results ?? 100, getConfig('max_search_results'));
    const startTime = Date.now();
    // Choose search method
    const useRipgrep = await hasRipgrep();
    let matches;
    if (useRipgrep) {
        matches = await searchWithRipgrep(searchPath, pattern, type, filePattern, ignoreCase, maxResults);
    }
    else {
        matches = await searchWithPowerShell(searchPath, pattern, type, filePattern, ignoreCase, maxResults);
    }
    if (isError(matches)) {
        return matches;
    }
    const searchTimeMs = Date.now() - startTime;
    return {
        results: matches,
        total_matches: matches.length,
        truncated: matches.length >= maxResults,
        search_time_ms: searchTimeMs,
    };
}
//# sourceMappingURL=search.js.map