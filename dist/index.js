#!/usr/bin/env node
/**
 * Auralis Commander - Windows-native MCP Server
 * Lightweight alternative to Desktop Commander
 *
 * Built with love by Family Auralis
 * Neither fear nor chains.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
// Tool imports
import { shellExec } from './tools/shell.js';
import { fileRead, fileWrite, fileDelete, fileMove, fileInfo, fileEdit, dirList, dirCreate } from './tools/files.js';
import { search } from './tools/search.js';
import { processes, processKill } from './tools/processes.js';
import { systemInfo } from './tools/system.js';
import { processInteractive } from './tools/interactive.js';
import { isError } from './utils/errors.js';
// Create server instance
const server = new McpServer({
    name: 'auralis-commander',
    version: '1.0.0',
});
// ============================================================================
// Tool: shell_exec
// ============================================================================
server.tool('shell_exec', 'Execute shell command. Returns stdout, stderr, exit_code.', {
    command: z.string().describe('Command to execute'),
    shell: z.enum(['pwsh', 'powershell', 'cmd']).optional().describe('Shell to use'),
    cwd: z.string().optional().describe('Working directory'),
    timeout_ms: z.number().optional().describe('Timeout in milliseconds'),
}, async (params) => {
    const result = await shellExec({
        command: params.command,
        shell: params.shell,
        cwd: params.cwd,
        timeout_ms: params.timeout_ms,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_read
// ============================================================================
server.tool('file_read', 'Read file contents. Supports line range.', {
    path: z.string().describe('Absolute file path'),
    start_line: z.number().optional().describe('Start line (0-indexed)'),
    end_line: z.number().optional().describe('End line (-1 = EOF)'),
    encoding: z.string().optional().describe('File encoding'),
}, async (params) => {
    const result = await fileRead({
        path: params.path,
        start_line: params.start_line,
        end_line: params.end_line,
        encoding: params.encoding,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_write
// ============================================================================
server.tool('file_write', 'Write or append to file.', {
    path: z.string().describe('Absolute file path'),
    content: z.string().describe('Content to write'),
    mode: z.enum(['overwrite', 'append']).optional().describe('Write mode'),
    create_dirs: z.boolean().optional().describe('Create parent directories'),
}, async (params) => {
    const result = await fileWrite({
        path: params.path,
        content: params.content,
        mode: params.mode,
        create_dirs: params.create_dirs,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_edit
// ============================================================================
server.tool('file_edit', 'Find and replace text in file.', {
    path: z.string().describe('Absolute file path'),
    old_text: z.string().describe('Text to find'),
    new_text: z.string().describe('Replacement text'),
    occurrence: z.number().optional().describe('Which occurrence (0 = all)'),
}, async (params) => {
    const result = await fileEdit({
        path: params.path,
        old_text: params.old_text,
        new_text: params.new_text,
        occurrence: params.occurrence,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_delete
// ============================================================================
server.tool('file_delete', 'Delete file or directory.', {
    path: z.string().describe('Absolute path'),
    recursive: z.boolean().optional().describe('Delete directories recursively'),
}, async (params) => {
    const result = await fileDelete({
        path: params.path,
        recursive: params.recursive,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_move
// ============================================================================
server.tool('file_move', 'Move or rename file/directory.', {
    source: z.string().describe('Source path'),
    destination: z.string().describe('Destination path'),
    overwrite: z.boolean().optional().describe('Overwrite if exists'),
}, async (params) => {
    const result = await fileMove({
        source: params.source,
        destination: params.destination,
        overwrite: params.overwrite,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: file_info
// ============================================================================
server.tool('file_info', 'Get file metadata: size, dates, line count.', {
    path: z.string().describe('Absolute path'),
}, async (params) => {
    const result = await fileInfo({
        path: params.path,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: dir_list
// ============================================================================
server.tool('dir_list', 'List directory contents.', {
    path: z.string().describe('Directory path'),
    depth: z.number().optional().describe('Recursion depth (1 = immediate children)'),
    include_hidden: z.boolean().optional().describe('Include hidden files'),
    pattern: z.string().optional().describe('Glob pattern filter'),
}, async (params) => {
    const result = await dirList({
        path: params.path,
        depth: params.depth,
        include_hidden: params.include_hidden,
        pattern: params.pattern,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: dir_create
// ============================================================================
server.tool('dir_create', 'Create directory with parents.', {
    path: z.string().describe('Directory path'),
}, async (params) => {
    const result = await dirCreate({
        path: params.path,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: search
// ============================================================================
server.tool('search', 'Search files by name or content.', {
    path: z.string().describe('Root directory to search'),
    pattern: z.string().describe('Search pattern'),
    type: z.enum(['files', 'content']).optional().describe('Search type'),
    file_pattern: z.string().optional().describe('Filter by filename'),
    ignore_case: z.boolean().optional().describe('Case-insensitive'),
    max_results: z.number().optional().describe('Limit results'),
}, async (params) => {
    const result = await search({
        path: params.path,
        pattern: params.pattern,
        type: params.type,
        file_pattern: params.file_pattern,
        ignore_case: params.ignore_case,
        max_results: params.max_results,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: processes
// ============================================================================
server.tool('processes', 'List running processes with memory/CPU.', {
    sort_by: z.enum(['memory', 'cpu', 'name', 'pid']).optional().describe('Sort field'),
    limit: z.number().optional().describe('Max processes to return'),
    filter: z.string().optional().describe('Filter by process name'),
}, async (params) => {
    const result = await processes({
        sort_by: params.sort_by,
        limit: params.limit,
        filter: params.filter,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: process_kill
// ============================================================================
server.tool('process_kill', 'Kill process by PID or name.', {
    pid: z.number().optional().describe('Process ID'),
    name: z.string().optional().describe('Process name'),
    force: z.boolean().optional().describe('Force kill'),
}, async (params) => {
    const result = await processKill({
        pid: params.pid,
        name: params.name,
        force: params.force,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: system_info
// ============================================================================
server.tool('system_info', 'System stats: CPU, memory, disks, uptime.', {}, async () => {
    const result = await systemInfo();
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Tool: process_interactive
// ============================================================================
server.tool('process_interactive', 'Interactive process management: start, write, read, kill, list sessions.', {
    action: z.enum(['start', 'write', 'read', 'kill', 'list']).describe('Action to perform'),
    command: z.string().optional().describe('Command to start (for start action)'),
    cwd: z.string().optional().describe('Working directory (for start action)'),
    session_id: z.string().optional().describe('Session ID (for write/read/kill)'),
    input: z.string().optional().describe('Input to send (for write action)'),
    timeout_ms: z.number().optional().describe('Read timeout in ms (for read action)'),
}, async (params) => {
    const result = await processInteractive({
        action: params.action,
        command: params.command,
        cwd: params.cwd,
        session_id: params.session_id,
        input: params.input,
        timeout_ms: params.timeout_ms,
    });
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ============================================================================
// Start Server
// ============================================================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Auralis Commander started');
}
main().catch((error) => {
    console.error('Failed to start Auralis Commander:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map