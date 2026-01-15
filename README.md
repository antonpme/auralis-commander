# Auralis Commander

**The lightweight Windows MCP server that does more with less.**

![Tools](https://img.shields.io/badge/tools-14-blue)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6)
![License](https://img.shields.io/badge/license-MIT-green)

## Why Auralis Commander?

We built Auralis Commander because existing solutions were either too heavy or too limited:

| MCP Server | Tools | Focus | Problem |
|------------|-------|-------|---------|
| **Desktop Commander** | 26 | Everything | Bloated, 5 tools just for processes |
| **Filesystem** (Anthropic) | 11 | Files only | No shell, no processes, no system info |
| **Windows CLI** | 8 | PowerShell | No file operations, limited scope |

**Auralis Commander**: 14 tools that cover shell, files, search, processes, and system — without the bloat.

## Key Advantages

### 🎯 Smart Design
One `process_interactive` tool replaces 5 separate tools in Desktop Commander:
- `start_process` → `process_interactive { action: "start" }`
- `read_process_output` → `process_interactive { action: "read" }`
- `interact_with_process` → `process_interactive { action: "write" }`
- `force_terminate` → `process_interactive { action: "kill" }`
- `list_sessions` → `process_interactive { action: "list" }`

### 📦 Batch Operations
Read multiple files in one call:
```javascript
file_read { paths: ["config.json", "package.json", ".env"] }
// Returns all files at once, errors don't block other files
```

### ⚡ Windows-Native
Optimized for PowerShell and Windows workflows. No WSL required, no Unix assumptions.

### 🪶 Lightweight
~14KB of focused code. Fast startup, minimal memory footprint, smaller context window usage.

## Tool Comparison

| Capability | Auralis | Desktop Commander | Filesystem | Windows CLI |
|------------|:-------:|:-----------------:|:----------:|:-----------:|
| Shell execution | ✅ | ✅ | ❌ | ✅ |
| File read/write | ✅ | ✅ | ✅ | ❌ |
| File search | ✅ | ✅ | ✅ | ❌ |
| Batch file read | ✅ | ✅ | ✅ | ❌ |
| Interactive processes | ✅ | ✅ | ❌ | ❌ |
| Process management | ✅ | ✅ | ❌ | ❌ |
| System info | ✅ | ✅ | ❌ | ✅ |
| Find & replace | ✅ | ✅ | ✅ | ❌ |
| **Total tools** | **14** | **26** | **11** | **8** |
| **Context overhead** | Low | High | Low | Low |

## Installation

### Option 1: npm (recommended)

```bash
npm install -g auralis-commander
```

### Option 2: Clone and Build

```bash
git clone https://github.com/antonpme/auralis-commander
cd auralis-commander
npm install
npm run build
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "auralis-commander": {
      "command": "node",
      "args": ["C:/path/to/auralis-commander/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop to load the server.

## Tools Reference

### Shell & System

| Tool | Description |
|------|-------------|
| `shell_exec` | Execute commands in pwsh, powershell, or cmd |
| `system_info` | Get CPU, memory, disk usage, and uptime |
| `processes` | List running processes with memory/CPU stats |
| `process_kill` | Terminate process by PID or name |
| `process_interactive` | Run and interact with long-running processes |

### Files

| Tool | Description |
|------|-------------|
| `file_read` | Read single file or batch with `paths` array |
| `file_write` | Write or append to file, auto-create directories |
| `file_edit` | Find and replace text in files |
| `file_delete` | Delete files or directories (with `recursive` flag) |
| `file_move` | Move or rename files and directories |
| `file_info` | Get metadata: size, dates, line count, permissions |

### Directories & Search

| Tool | Description |
|------|-------------|
| `dir_list` | List contents with depth control and glob patterns |
| `dir_create` | Create directory with parent directories |
| `search` | Search by filename or content with filtering |

## Usage Examples

### Run a Dev Server

```javascript
// Start Next.js dev server
process_interactive { 
  action: "start", 
  command: "npm run dev", 
  cwd: "C:/projects/my-app" 
}
// → { session_id: "a1b2c3", output: "ready on http://localhost:3000", is_running: true }

// Check for new output
process_interactive { action: "read", session_id: "a1b2c3", timeout_ms: 5000 }

// Stop when done
process_interactive { action: "kill", session_id: "a1b2c3" }
```

### Interactive Python REPL

```javascript
process_interactive { action: "start", command: "python -u -i" }  // -u: unbuffered, -i: interactive
// → { session_id: "x1y2z3", output: "Python 3.12.0\n>>>", is_running: true }

process_interactive { action: "write", session_id: "x1y2z3", input: "2 + 2\n" }
// → { output: "4\n>>>", is_running: true }

process_interactive { action: "write", session_id: "x1y2z3", input: "exit()\n" }
// → { output: "", is_running: false }
```

### Batch Configuration Check

```javascript
file_read { 
  paths: [
    "package.json",
    "tsconfig.json", 
    ".env",
    ".env.local"
  ]
}
// Returns all files; missing ones show error without blocking others
```

### Quick System Health Check

```javascript
system_info {}
// → { cpu: { model, cores, usage }, memory: { total, used, free }, disks: [...], uptime: "3d 14h" }

processes { sort_by: "memory", limit: 10 }
// → Top 10 memory consumers
```

## Configuration

Create `auralis-commander.json` in your home directory for defaults:

```json
{
  "default_shell": "pwsh",
  "default_cwd": "C:/Projects",
  "max_file_read_mb": 50
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `default_shell` | `pwsh` | Shell for commands: `pwsh`, `powershell`, or `cmd` |
| `default_cwd` | Home dir | Default working directory |
| `max_file_read_mb` | `50` | Maximum file size for reading |

## Architecture

```
auralis-commander/
├── src/
│   ├── index.ts          # MCP server setup & tool registration
│   ├── config.ts         # Configuration management
│   ├── tools/
│   │   ├── shell.ts      # shell_exec
│   │   ├── files.ts      # file_* and dir_* operations
│   │   ├── search.ts     # Content and filename search
│   │   ├── processes.ts  # Process listing and killing
│   │   ├── system.ts     # System information
│   │   └── interactive.ts # Interactive process sessions
│   └── utils/
│       ├── powershell.ts # PowerShell execution wrapper
│       ├── paths.ts      # Path normalization
│       └── errors.ts     # Error handling
├── dist/                 # Compiled JavaScript
└── package.json
```

## Contributing

Issues and PRs welcome. Please:
1. Keep tools focused — no feature creep
2. Maintain Windows compatibility
3. Test with Claude Desktop before submitting

## License

MIT License — use it, modify it, ship it.