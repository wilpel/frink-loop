// Claude Code Session Manager
// Uses --session-id and --resume to maintain context across calls

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { c, clearLine } from "../ui/theme.js";

// =============================================================================
// Types
// =============================================================================

export interface ClaudeResponse {
  output: string;
  exitCode: number;
  success: boolean;
}

export interface SessionConfig {
  workingDirectory: string;
  yoloMode: boolean;
}

// =============================================================================
// Time Formatting
// =============================================================================

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
}

// =============================================================================
// Session State
// =============================================================================

// Global start time for total elapsed
let globalStartTime: number | null = null;

// =============================================================================
// Claude Session Class
// =============================================================================

export class ClaudeSession {
  private sessionId: string;
  private workingDirectory: string;
  private yoloMode: boolean;
  private isFirstCall: boolean = true;
  private callCount: number = 0;

  constructor(config: SessionConfig, sessionId?: string) {
    this.sessionId = sessionId || randomUUID();
    this.workingDirectory = config.workingDirectory;
    this.yoloMode = config.yoloMode;
    console.log(c.muted(`  [*] Session: ${this.sessionId}`));
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getCallCount(): number {
    return this.callCount;
  }

  async send(prompt: string, timeoutMs: number = 300000): Promise<ClaudeResponse> {
    this.callCount++;

    const args: string[] = ["--print"];

    // YOLO mode - skip all permissions
    if (this.yoloMode) {
      args.push("--dangerously-skip-permissions");
    }

    // First call uses --session-id, subsequent calls use --resume
    if (this.isFirstCall) {
      args.push("--session-id", this.sessionId);
      this.isFirstCall = false;
    } else {
      args.push("--resume", this.sessionId);
    }

    args.push(prompt);

    // Show Claude header
    console.log();
    console.log(c.claude(`  [Claude #${this.callCount}]`));
    console.log(c.muted(`  Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? "..." : ""}`));
    console.log(c.muted(`  Running: claude ${args.slice(0, -1).join(" ")} "<prompt>"`));
    console.log();

    // Set global start time on first call
    if (!globalStartTime) {
      globalStartTime = Date.now();
    }

    // ASCII loading animation with elapsed time
    const frames = ["[    ]", "[=   ]", "[==  ]", "[=== ]", "[====]", "[ ===]", "[  ==]", "[   =]"];
    let frameIndex = 0;
    let hasOutput = false;
    const callStartTime = Date.now();

    const spinner = setInterval(() => {
      if (!hasOutput) {
        const callElapsed = formatTime(Date.now() - callStartTime);
        const totalElapsed = formatTime(Date.now() - globalStartTime!);
        process.stdout.write(`\r  ${c.muted(frames[frameIndex])} ${c.muted(`Claude working... ${callElapsed}`)}  ${c.muted(`| Total: ${totalElapsed}`)}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }
    }, 100);

    return new Promise((resolve) => {
      const claude = spawn("claude", args, {
        cwd: this.workingDirectory,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          FORCE_COLOR: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";
      let visibleLines: string[] = [];
      const maxVisibleLines = 5;
      let drawnLineCount = 0;

      // Stream stdout - show latest chunk of Claude's output
      claude.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;

        // Clear spinner on first output
        if (!hasOutput) {
          hasOutput = true;
          clearLine();
        }

        // Add new lines to visible buffer
        const newLines = text.split("\n").filter(l => l.trim());
        visibleLines.push(...newLines);
        if (visibleLines.length > maxVisibleLines) {
          visibleLines = visibleLines.slice(-maxVisibleLines);
        }

        // Clear previous output lines
        if (drawnLineCount > 0) {
          process.stdout.write(`\x1b[${drawnLineCount}A`);
          for (let i = 0; i < drawnLineCount; i++) {
            process.stdout.write("\x1b[2K\n");
          }
          process.stdout.write(`\x1b[${drawnLineCount}A`);
        }

        // Draw latest lines
        for (const line of visibleLines) {
          const truncated = line.length > 80 ? line.substring(0, 77) + "..." : line;
          console.log(c.muted(`  ${truncated}`));
        }
        drawnLineCount = visibleLines.length;
      });

      // Close stdin so Claude doesn't wait for input
      claude.stdin.end();

      claude.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        // Show stderr (might have important info)
        if (text.trim()) {
          // Clear spinner line first
          if (!hasOutput) {
            hasOutput = true;
            clearLine();
          }
          process.stderr.write(c.muted(`  ${text}`));
        }
      });

      const timeout = setTimeout(() => {
        clearInterval(spinner);
        clearLine();
        console.log(c.muted("  [!!] Timeout"));
        claude.kill("SIGTERM");
        resolve({
          output: output + "\n[TIMEOUT]",
          exitCode: 124,
          success: false,
        });
      }, timeoutMs);

      claude.on("close", (code: number | null) => {
        clearInterval(spinner);
        clearTimeout(timeout);
        const exitCode = code ?? 0;
        const callTime = formatTime(Date.now() - callStartTime);
        const totalTime = formatTime(Date.now() - globalStartTime!);

        if (!hasOutput) {
          clearLine();
        }
        console.log();
        if (exitCode === 0) {
          console.log(c.claude(`  [Claude #${this.callCount} done] `) + c.muted(`${callTime} | Total: ${totalTime}`));
        } else {
          console.log(c.muted(`  [Claude #${this.callCount} failed] ${callTime}`));
        }

        resolve({
          output: output + (errorOutput && exitCode !== 0 ? `\n[STDERR]: ${errorOutput}` : ""),
          exitCode,
          success: exitCode === 0,
        });
      });

      claude.on("error", (err: Error) => {
        clearInterval(spinner);
        clearTimeout(timeout);
        clearLine();
        console.log(c.muted(`  [!!] Error: ${err.message}`));
        resolve({
          output: `[ERROR]: ${err.message}`,
          exitCode: 1,
          success: false,
        });
      });
    });
  }
}

// =============================================================================
// Singleton Session Management
// =============================================================================

let activeSession: ClaudeSession | null = null;

export function getOrCreateSession(config: SessionConfig): ClaudeSession {
  if (!activeSession) {
    activeSession = new ClaudeSession(config);
  }
  return activeSession;
}

export function getSession(): ClaudeSession | null {
  return activeSession;
}

export function resetSession(): void {
  activeSession = null;
  globalStartTime = null;
}
