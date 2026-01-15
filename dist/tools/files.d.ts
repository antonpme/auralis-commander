/**
 * Auralis Commander File Tools
 * File operations: read, write, delete, move, info, edit
 */
import { TonMCPError } from '../utils/errors.js';
export interface FileReadParams {
    path: string;
    start_line?: number;
    end_line?: number;
    encoding?: string;
}
export interface FileReadResult {
    content: string;
    total_lines: number;
    read_lines: number;
    truncated: boolean;
}
export declare function fileRead(params: FileReadParams): Promise<FileReadResult | TonMCPError>;
export interface FileWriteParams {
    path: string;
    content: string;
    mode?: 'overwrite' | 'append';
    create_dirs?: boolean;
}
export interface FileWriteResult {
    path: string;
    bytes_written: number;
    created: boolean;
}
export declare function fileWrite(params: FileWriteParams): Promise<FileWriteResult | TonMCPError>;
export interface FileDeleteParams {
    path: string;
    recursive?: boolean;
}
export interface FileDeleteResult {
    deleted: boolean;
    path: string;
    was_directory: boolean;
}
export declare function fileDelete(params: FileDeleteParams): Promise<FileDeleteResult | TonMCPError>;
export interface FileMoveParams {
    source: string;
    destination: string;
    overwrite?: boolean;
}
export interface FileMoveResult {
    source: string;
    destination: string;
    overwritten: boolean;
}
export declare function fileMove(params: FileMoveParams): Promise<FileMoveResult | TonMCPError>;
export interface FileInfoParams {
    path: string;
}
export interface FileInfoResult {
    path: string;
    exists: boolean;
    is_directory: boolean;
    size_bytes: number;
    size_human: string;
    created: string | null;
    modified: string | null;
    accessed: string | null;
    readonly: boolean;
    hidden: boolean;
    line_count: number | null;
}
export declare function fileInfo(params: FileInfoParams): Promise<FileInfoResult | TonMCPError>;
export interface FileEditParams {
    path: string;
    old_text: string;
    new_text: string;
    occurrence?: number;
}
export interface FileEditResult {
    replacements: number;
    path: string;
}
export declare function fileEdit(params: FileEditParams): Promise<FileEditResult | TonMCPError>;
export interface DirListParams {
    path: string;
    depth?: number;
    include_hidden?: boolean;
    pattern?: string;
}
export interface DirListItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size_bytes: number;
    modified: string;
}
export interface DirListResult {
    path: string;
    items: DirListItem[];
    total_items: number;
    truncated: boolean;
}
export declare function dirList(params: DirListParams): Promise<DirListResult | TonMCPError>;
export interface DirCreateParams {
    path: string;
}
export interface DirCreateResult {
    path: string;
    created: boolean;
    already_existed: boolean;
}
export declare function dirCreate(params: DirCreateParams): Promise<DirCreateResult | TonMCPError>;
