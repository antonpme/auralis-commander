/**
 * Auralis Commander File Tools
 * File operations: read, write, delete, move, info, edit
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { normalizePath, formatBytes, getDirName } from '../utils/paths.js';
import { createError, mapNodeError, TonMCPError } from '../utils/errors.js';
import { getConfig } from '../config.js';

// ============================================================================
// file_read
// ============================================================================

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

export async function fileRead(
  params: FileReadParams
): Promise<FileReadResult | TonMCPError> {
  const filePath = normalizePath(params.path);
  const startLine = params.start_line ?? 0;
  const endLine = params.end_line ?? -1;
  const encoding = (params.encoding ?? 'utf8') as BufferEncoding;

  try {
    // Check if file exists
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      return createError('NOT_A_FILE', `Path is a directory: ${filePath}`);
    }

    // Check file size limit
    const maxBytes = getConfig('max_file_read_mb') * 1024 * 1024;
    if (stats.size > maxBytes) {
      return createError('INVALID_ARGUMENT', 
        `File too large: ${formatBytes(stats.size)} (max ${getConfig('max_file_read_mb')}MB)`);
    }

    // Read the file
    const content = await fs.readFile(filePath, encoding);
    const lines = content.split('\n');
    const totalLines = lines.length;

    // Handle line range
    let actualStart = startLine;
    let actualEnd = endLine === -1 ? totalLines : Math.min(endLine + 1, totalLines);

    // Negative start_line = read from end (tail behavior)
    if (startLine < 0) {
      actualStart = Math.max(0, totalLines + startLine);
      actualEnd = totalLines;
    }

    // Clamp values
    actualStart = Math.max(0, Math.min(actualStart, totalLines));
    actualEnd = Math.max(actualStart, Math.min(actualEnd, totalLines));

    const selectedLines = lines.slice(actualStart, actualEnd);
    const readLines = selectedLines.length;

    return {
      content: selectedLines.join('\n'),
      total_lines: totalLines,
      read_lines: readLines,
      truncated: actualEnd < totalLines,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, filePath);
  }
}

// ============================================================================
// file_write
// ============================================================================

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

export async function fileWrite(
  params: FileWriteParams
): Promise<FileWriteResult | TonMCPError> {
  const filePath = normalizePath(params.path);
  const mode = params.mode ?? 'overwrite';
  const createDirs = params.create_dirs ?? true;

  try {
    // Check if file already exists
    let fileExisted = false;
    try {
      await fs.access(filePath);
      fileExisted = true;
    } catch {
      fileExisted = false;
    }

    // Create parent directories if needed
    if (createDirs) {
      const dir = getDirName(filePath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Write or append
    if (mode === 'append') {
      await fs.appendFile(filePath, params.content, 'utf8');
    } else {
      await fs.writeFile(filePath, params.content, 'utf8');
    }

    return {
      path: filePath,
      bytes_written: Buffer.byteLength(params.content, 'utf8'),
      created: !fileExisted,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, filePath);
  }
}

// ============================================================================
// file_delete
// ============================================================================

export interface FileDeleteParams {
  path: string;
  recursive?: boolean;
}

export interface FileDeleteResult {
  deleted: boolean;
  path: string;
  was_directory: boolean;
}

export async function fileDelete(
  params: FileDeleteParams
): Promise<FileDeleteResult | TonMCPError> {
  const filePath = normalizePath(params.path);
  const recursive = params.recursive ?? false;

  try {
    const stats = await fs.stat(filePath);
    const isDirectory = stats.isDirectory();

    if (isDirectory && !recursive) {
      return createError('INVALID_ARGUMENT', 
        `Cannot delete directory without recursive flag: ${filePath}`);
    }

    await fs.rm(filePath, { recursive, force: false });

    return {
      deleted: true,
      path: filePath,
      was_directory: isDirectory,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, filePath);
  }
}

// ============================================================================
// file_move
// ============================================================================

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

export async function fileMove(
  params: FileMoveParams
): Promise<FileMoveResult | TonMCPError> {
  const sourcePath = normalizePath(params.source);
  const destPath = normalizePath(params.destination);
  const overwrite = params.overwrite ?? false;

  try {
    // Check source exists
    await fs.access(sourcePath);

    // Check if destination exists
    let destExisted = false;
    try {
      await fs.access(destPath);
      destExisted = true;
      
      if (!overwrite) {
        return createError('ALREADY_EXISTS', 
          `Destination already exists: ${destPath}. Use overwrite=true to replace.`);
      }
    } catch {
      destExisted = false;
    }

    // Create destination parent directory if needed
    const destDir = getDirName(destPath);
    await fs.mkdir(destDir, { recursive: true });

    // Move/rename the file
    await fs.rename(sourcePath, destPath);

    return {
      source: sourcePath,
      destination: destPath,
      overwritten: destExisted,
    };
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    
    // Handle cross-device move (need to copy + delete)
    if (nodeErr.code === 'EXDEV') {
      try {
        await fs.cp(sourcePath, destPath, { recursive: true });
        await fs.rm(sourcePath, { recursive: true });
        return {
          source: sourcePath,
          destination: destPath,
          overwritten: false,
        };
      } catch (copyErr) {
        return mapNodeError(copyErr as NodeJS.ErrnoException, sourcePath);
      }
    }
    
    return mapNodeError(nodeErr, sourcePath);
  }
}

// ============================================================================
// file_info
// ============================================================================

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

export async function fileInfo(
  params: FileInfoParams
): Promise<FileInfoResult | TonMCPError> {
  const filePath = normalizePath(params.path);

  try {
    const stats = await fs.stat(filePath);
    const isDirectory = stats.isDirectory();

    // Count lines for text files under 10MB
    let lineCount: number | null = null;
    if (!isDirectory && stats.size < 10 * 1024 * 1024) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        lineCount = content.split('\n').length;
      } catch {
        // Binary file or encoding issue - skip line count
        lineCount = null;
      }
    }

    // Check if hidden (Windows: check hidden attribute via filename starting with .)
    // For proper Windows hidden check, we'd use PowerShell, but this is a quick approximation
    const basename = path.basename(filePath);
    const hidden = basename.startsWith('.');

    // Check if readonly
    const readonly = (stats.mode & 0o200) === 0;

    return {
      path: filePath,
      exists: true,
      is_directory: isDirectory,
      size_bytes: stats.size,
      size_human: formatBytes(stats.size),
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      readonly,
      hidden,
      line_count: lineCount,
    };
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return {
        path: filePath,
        exists: false,
        is_directory: false,
        size_bytes: 0,
        size_human: '0 B',
        created: null,
        modified: null,
        accessed: null,
        readonly: false,
        hidden: false,
        line_count: null,
      };
    }
    return mapNodeError(nodeErr, filePath);
  }
}

// ============================================================================
// file_edit
// ============================================================================

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

export async function fileEdit(
  params: FileEditParams
): Promise<FileEditResult | TonMCPError> {
  const filePath = normalizePath(params.path);
  const { old_text, new_text } = params;
  const occurrence = params.occurrence ?? 1; // Default to first occurrence

  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf8');

    // Find occurrences
    const occurrences: number[] = [];
    let pos = 0;
    while (true) {
      const idx = content.indexOf(old_text, pos);
      if (idx === -1) break;
      occurrences.push(idx);
      pos = idx + 1;
    }

    if (occurrences.length === 0) {
      // Show context for debugging
      const preview = content.slice(0, 500);
      return createError('TEXT_NOT_FOUND', 
        `Text not found in file: ${filePath}`, {
          searched_for: old_text.slice(0, 100),
          file_preview: preview,
        });
    }

    let newContent: string;
    let replacements: number;

    if (occurrence === 0) {
      // Replace all occurrences
      newContent = content.split(old_text).join(new_text);
      replacements = occurrences.length;
    } else {
      // Replace specific occurrence
      const targetIdx = occurrence > 0 ? occurrence - 1 : occurrences.length + occurrence;
      
      if (targetIdx < 0 || targetIdx >= occurrences.length) {
        return createError('TEXT_NOT_FOUND', 
          `Occurrence ${occurrence} not found (only ${occurrences.length} occurrences exist)`);
      }

      const pos = occurrences[targetIdx]!;
      newContent = content.slice(0, pos) + new_text + content.slice(pos + old_text.length);
      replacements = 1;
    }

    // Write back
    await fs.writeFile(filePath, newContent, 'utf8');

    return {
      replacements,
      path: filePath,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, filePath);
  }
}

// ============================================================================
// dir_list
// ============================================================================

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

const MAX_DIR_ITEMS = 500;

/**
 * Check if a filename matches a glob pattern (simple implementation)
 */
function matchesPattern(filename: string, pattern: string): boolean {
  if (pattern === '*') return true;
  
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}

export async function dirList(
  params: DirListParams
): Promise<DirListResult | TonMCPError> {
  const dirPath = normalizePath(params.path);
  const depth = params.depth ?? 1;
  const includeHidden = params.include_hidden ?? false;
  const pattern = params.pattern ?? '*';

  const items: DirListItem[] = [];
  let truncated = false;

  async function scanDir(currentPath: string, currentDepth: number): Promise<void> {
    if (currentDepth > depth || items.length >= MAX_DIR_ITEMS) {
      if (items.length >= MAX_DIR_ITEMS) truncated = true;
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (items.length >= MAX_DIR_ITEMS) {
          truncated = true;
          return;
        }

        const name = entry.name;
        const fullPath = path.join(currentPath, name);

        // Skip hidden files unless requested
        if (!includeHidden && name.startsWith('.')) {
          continue;
        }

        // Check pattern match
        if (!matchesPattern(name, pattern)) {
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);
          
          items.push({
            name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size_bytes: stats.size,
            modified: stats.mtime.toISOString(),
          });

          // Recurse into directories
          if (entry.isDirectory() && currentDepth < depth) {
            await scanDir(fullPath, currentDepth + 1);
          }
        } catch {
          // Skip items we can't stat (permission issues, etc.)
        }
      }
    } catch (err) {
      // If we can't read a subdirectory, skip it
      if (currentDepth > 1) return;
      throw err;
    }
  }

  try {
    // Verify path is a directory
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return createError('NOT_A_DIRECTORY', `Not a directory: ${dirPath}`);
    }

    await scanDir(dirPath, 1);

    // Sort: directories first, then files, alphabetical within each
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return {
      path: dirPath,
      items,
      total_items: items.length,
      truncated,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, dirPath);
  }
}

// ============================================================================
// dir_create
// ============================================================================

export interface DirCreateParams {
  path: string;
}

export interface DirCreateResult {
  path: string;
  created: boolean;
  already_existed: boolean;
}

export async function dirCreate(
  params: DirCreateParams
): Promise<DirCreateResult | TonMCPError> {
  const dirPath = normalizePath(params.path);

  try {
    // Check if already exists
    let alreadyExisted = false;
    try {
      const stats = await fs.stat(dirPath);
      if (stats.isDirectory()) {
        alreadyExisted = true;
      } else {
        return createError('NOT_A_DIRECTORY', 
          `Path exists but is not a directory: ${dirPath}`);
      }
    } catch {
      alreadyExisted = false;
    }

    if (!alreadyExisted) {
      await fs.mkdir(dirPath, { recursive: true });
    }

    return {
      path: dirPath,
      created: !alreadyExisted,
      already_existed: alreadyExisted,
    };
  } catch (err) {
    return mapNodeError(err as NodeJS.ErrnoException, dirPath);
  }
}
