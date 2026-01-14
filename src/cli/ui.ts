// CLI UI Components
// Clean terminal output for Frink Loop

import figlet from "figlet";
import { colors, c, divider } from "../ui/theme.js";

// Re-export colors for backward compatibility
export { colors };

// =============================================================================
// Logo and Branding
// =============================================================================

/**
 * Display ASCII art logo with padding
 */
export function showLogo(): void {
  const logo = figlet.textSync("FRINK", {
    font: "ANSI Shadow",
    horizontalLayout: "fitted",
  });

  // Add left padding to each line
  const paddedLogo = logo
    .split("\n")
    .map(line => "    " + line)
    .join("\n");

  // Top spacing
  console.log("\n");
  console.log(colors.primary(paddedLogo));
  console.log(colors.muted("    " + divider("-", 50)));
  console.log(colors.primary("    [*] Smart Autonomous Coding Loop"));
  console.log(colors.muted("        OpenAI | Anthropic --> Claude Code"));
  console.log(colors.muted("    " + divider("-", 50)));
  console.log();
}

// =============================================================================
// Status Messages
// =============================================================================

/**
 * Display YOLO mode warning
 */
export function showDisclaimer(): void {
  console.log(colors.warning("  [!] WARNING: YOLO MODE ENABLED"));
  console.log(colors.muted("  Frink will auto-accept all actions without confirmation."));
  console.log(colors.muted("  This includes file edits, command execution, and more."));
  console.log(colors.muted("  By continuing, you accept all risks."));
  console.log();
}

/**
 * Display task configuration
 */
export function showTaskStatus(task: string, workingDir: string): void {
  console.log(colors.primary("  [Config]"));
  console.log(colors.muted(`  Task:      ${task}`));
  console.log(colors.muted(`  Directory: ${workingDir}`));
  console.log();
}

/**
 * Display session info
 */
export function showSessionInfo(sessionId: string): void {
  console.log(colors.muted(`  [*] Session: ${sessionId}`));
}

// =============================================================================
// Result Display
// =============================================================================

/**
 * Display final result
 */
export function showResult(success: boolean, summary: string, claudeCalls: number): void {
  console.log();
  console.log(colors.muted("  " + divider("=", 50)));
  console.log(success ? colors.primary("  [*] Task Completed") : colors.muted("  [!!] Task Failed"));
  console.log(colors.muted(`  ${summary}`));
  console.log(colors.muted(`  Claude calls: ${claudeCalls}`));
  console.log(colors.muted("  " + divider("=", 50)));
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Display a divider line
 */
export function showDivider(): void {
  console.log(colors.muted("  " + divider("-", 50)));
}

/**
 * Clear current line
 */
export function clearLine(): void {
  process.stdout.write("\r" + " ".repeat(80) + "\r");
}
