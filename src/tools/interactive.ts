/**
 * Auralis Commander - Interactive Process Tool
 * Single tool replacing 5 Desktop Commander tools
 * 
 * Built by Family Auralis
 */

import { spawn, ChildProcess } from 'child_process';
import { createError, TonMCPError } from '../utils/errors.js';
import { normalizePath, getHomeDir } from '../utils/paths.js';
import { randomBytes } from 'crypto';

// Types
export type InteractiveAction = 'start' | 'write' | 'read' | 'kill' | 'list';

export interface ProcessInteractiveParams {
  action: InteractiveAction;
  command?: string;
  cwd?: string;
  session_id?: string;
  input?: string;
  timeout_ms?: number;
}

export interface SessionInfo {
  session_id: string;
  command: string;
  started: string;
  is_running: boolean;
  output_lines: number;
}

export interface ProcessInteractiveResult {
  session_id?: string;
  output?: string;
  is_running?: boolean;
  sessions?: SessionInfo[];
}

// Session storage
interface Session {
  process: ChildProcess;
  output: string[];
  started: Date;
  command: string;
  cwd: string;
}

const sessions = new Map<string, Session>();
const MAX_SESSIONS = 10;
const MAX_OUTPUT_LINES = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Auto-cleanup dead sessions
setInterval(() => {
  for (const [id, session] of sessions) {
    if (session.process.killed || session.process.exitCode !== null) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Generate short session ID
 */
function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Start a new interactive process
 */
async function startProcess(
  command: string,
  cwd?: string
): Promise<ProcessInteractiveResult | TonMCPError> {
  // Check session limit
  if (sessions.size >= MAX_SESSIONS) {
    return createError('LIMIT_EXCEEDED', `Maximum ${MAX_SESSIONS} sessions allowed. Kill some first.`);
  }

  const workingDir = cwd ? normalizePath(cwd) : getHomeDir();
  const sessionId = generateSessionId();

  return new Promise((resolve) => {
    // Parse command into executable and args
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [command];
    const executable = parts[0];
    const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));

    const child = spawn(executable, args, {
      cwd: workingDir,
      env: process.env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const session: Session = {
      process: child,
      output: [],
      started: new Date(),
      command,
      cwd: workingDir,
    };

    // Collect output
    const addOutput = (data: string) => {
      const lines = data.split('\n');
      session.output.push(...lines);
      // Trim old output to prevent memory bloat
      if (session.output.length > MAX_OUTPUT_LINES) {
        session.output = session.output.slice(-MAX_OUTPUT_LINES);
      }
    };

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', addOutput);

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', addOutput);

    child.on('error', (err) => {
      resolve(createError('PROCESS_ERROR', `Failed to start: ${err.message}`));
    });

    // Give process time to start and produce initial output
    setTimeout(() => {
      if (child.killed || child.exitCode !== null) {
        resolve(createError('PROCESS_DIED', 'Process exited immediately', {
          output: session.output.join('\n'),
        }));
        return;
      }

      sessions.set(sessionId, session);
      resolve({
        session_id: sessionId,
        output: session.output.join('\n'),
        is_running: true,
      });
    }, 500);
  });
}

/**
 * Write input to a process
 */
async function writeToProcess(
  sessionId: string,
  input: string
): Promise<ProcessInteractiveResult | TonMCPError> {
  const session = sessions.get(sessionId);
  if (!session) {
    return createError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
  }

  if (session.process.killed || session.process.exitCode !== null) {
    sessions.delete(sessionId);
    return createError('PROCESS_DIED', 'Process is no longer running', {
      final_output: session.output.join('\n'),
    });
  }

  // Clear output buffer before writing
  const outputBefore = session.output.length;

  return new Promise((resolve) => {
    session.process.stdin?.write(input, (err) => {
      if (err) {
        resolve(createError('WRITE_ERROR', `Failed to write: ${err.message}`));
        return;
      }

      // Wait for response
      setTimeout(() => {
        const newOutput = session.output.slice(outputBefore).join('\n');
        resolve({
          session_id: sessionId,
          output: newOutput,
          is_running: session.process.exitCode === null && !session.process.killed,
        });
      }, 300);
    });
  });
}

/**
 * Read output from a process (with timeout)
 */
async function readFromProcess(
  sessionId: string,
  timeoutMs: number = 5000
): Promise<ProcessInteractiveResult | TonMCPError> {
  const session = sessions.get(sessionId);
  if (!session) {
    return createError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
  }

  const outputBefore = session.output.length;

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkOutput = () => {
      const newOutput = session.output.slice(outputBefore);
      const elapsed = Date.now() - startTime;
      const isRunning = session.process.exitCode === null && !session.process.killed;

      // Return if we have new output, process died, or timeout
      if (newOutput.length > 0 || !isRunning || elapsed >= timeoutMs) {
        resolve({
          session_id: sessionId,
          output: newOutput.join('\n'),
          is_running: isRunning,
        });
        return;
      }

      // Keep checking
      setTimeout(checkOutput, 100);
    };

    checkOutput();
  });
}

/**
 * Kill a process
 */
function killProcess(sessionId: string): ProcessInteractiveResult | TonMCPError {
  const session = sessions.get(sessionId);
  if (!session) {
    return createError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
  }

  const finalOutput = session.output.join('\n');

  if (!session.process.killed && session.process.exitCode === null) {
    session.process.kill('SIGTERM');
    // Force kill after 1 second
    setTimeout(() => {
      if (!session.process.killed) {
        session.process.kill('SIGKILL');
      }
    }, 1000);
  }

  sessions.delete(sessionId);

  return {
    session_id: sessionId,
    output: finalOutput,
    is_running: false,
  };
}

/**
 * List all sessions
 */
function listSessions(): ProcessInteractiveResult {
  const sessionList: SessionInfo[] = [];

  for (const [id, session] of sessions) {
    sessionList.push({
      session_id: id,
      command: session.command,
      started: session.started.toISOString(),
      is_running: session.process.exitCode === null && !session.process.killed,
      output_lines: session.output.length,
    });
  }

  return { sessions: sessionList };
}

/**
 * Main entry point
 */
export async function processInteractive(
  params: ProcessInteractiveParams
): Promise<ProcessInteractiveResult | TonMCPError> {
  const { action, command, cwd, session_id, input, timeout_ms } = params;

  switch (action) {
    case 'start':
      if (!command) {
        return createError('INVALID_PARAMS', 'Command required for start action');
      }
      return startProcess(command, cwd);

    case 'write':
      if (!session_id) {
        return createError('INVALID_PARAMS', 'session_id required for write action');
      }
      if (input === undefined) {
        return createError('INVALID_PARAMS', 'input required for write action');
      }
      return writeToProcess(session_id, input);

    case 'read':
      if (!session_id) {
        return createError('INVALID_PARAMS', 'session_id required for read action');
      }
      return readFromProcess(session_id, timeout_ms);

    case 'kill':
      if (!session_id) {
        return createError('INVALID_PARAMS', 'session_id required for kill action');
      }
      return killProcess(session_id);

    case 'list':
      return listSessions();

    default:
      return createError('INVALID_PARAMS', `Unknown action: ${action}`);
  }
}
