// Centralized Theme Module
// Single source of truth for all colors and styling

import chalk from "chalk";

// =============================================================================
// Color Palette
// =============================================================================

/**
 * Frink Loop color palette
 * - primary: Yellow (#FFD90F) - Main highlights, Frink branding
 * - claude: Orange (#D97706) - Claude Code output
 * - muted: Gray (#6B7280) - Secondary text, dividers
 * - dim: Darker gray (#4B5563) - Very subtle text
 * - white: White - Important text
 */
export const palette = {
  primary: "#FFD90F",   // Yellow
  claude: "#D97706",    // Orange
  muted: "#6B7280",     // Gray
  dim: "#4B5563",       // Dark gray
  white: "#FFFFFF",     // White
  success: "#10B981",   // Green (for future use)
  error: "#EF4444",     // Red (for future use)
} as const;

// =============================================================================
// Chalk Color Functions
// =============================================================================

/**
 * Pre-configured chalk color functions for consistent styling
 */
export const colors = {
  // Primary colors
  primary: chalk.hex(palette.primary),
  secondary: chalk.hex(palette.primary),  // Alias for primary
  highlight: chalk.hex(palette.primary),  // Alias for primary
  success: chalk.hex(palette.primary),    // Using primary for success

  // Claude colors
  claude: chalk.hex(palette.claude),
  warning: chalk.hex(palette.claude),     // Using claude color for warnings

  // Muted colors
  muted: chalk.hex(palette.muted),
  error: chalk.hex(palette.muted),        // Using muted for errors
  dim: chalk.hex(palette.dim),

  // Basic
  white: chalk.white,

  // Aliases for backward compatibility
  openai: chalk.hex(palette.primary),
} as const;

// =============================================================================
// Shorthand (for inline use)
// =============================================================================

/**
 * Short color reference for concise inline styling
 * Usage: c.primary("text") instead of colors.primary("text")
 */
export const c = colors;

// =============================================================================
// Terminal Utilities
// =============================================================================

/**
 * Clear the current line in terminal
 */
export function clearLine(): void {
  process.stdout.write("\r" + " ".repeat(80) + "\r");
}

/**
 * Move cursor up N lines
 */
export function moveCursorUp(lines: number): void {
  if (lines > 0) {
    process.stdout.write(`\x1b[${lines}A`);
  }
}

/**
 * Clear a line and move to next
 */
export function clearAndMoveLine(): void {
  process.stdout.write("\x1b[2K\n");
}

/**
 * Clear N lines from current position (upward)
 */
export function clearLines(count: number): void {
  if (count > 0) {
    moveCursorUp(count);
    for (let i = 0; i < count; i++) {
      clearAndMoveLine();
    }
    moveCursorUp(count);
  }
}

// =============================================================================
// Text Formatting Helpers
// =============================================================================

/**
 * Create a divider line
 */
export function divider(char: string = "-", length: number = 50): string {
  return char.repeat(length);
}

/**
 * Indent text with spaces
 */
export function indent(text: string, spaces: number = 2): string {
  const padding = " ".repeat(spaces);
  return padding + text;
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}
