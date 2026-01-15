/**
 * TonMCP Search Tool
 * File and content search with ripgrep or PowerShell fallback
 */
import { TonMCPError } from '../utils/errors.js';
export interface SearchParams {
    path: string;
    pattern: string;
    type?: 'files' | 'content';
    file_pattern?: string;
    ignore_case?: boolean;
    max_results?: number;
}
export interface SearchMatch {
    path: string;
    name: string;
    match?: string;
    line?: number;
    context?: string;
}
export interface SearchResult {
    results: SearchMatch[];
    total_matches: number;
    truncated: boolean;
    search_time_ms: number;
}
/**
 * Main search function
 */
export declare function search(params: SearchParams): Promise<SearchResult | TonMCPError>;
