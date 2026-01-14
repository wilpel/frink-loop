// Reset Session Tool
// Allows the agent to clear Claude's context and start fresh

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import { resetSession, getOrCreateSession, getSession, type SessionConfig } from "./claude-session.js";
import { c } from "../ui/theme.js";

// Store the session config for recreation
let lastSessionConfig: SessionConfig | null = null;

export function setSessionConfig(config: SessionConfig): void {
  lastSessionConfig = config;
}

export const resetClaudeSessionTool = defineTool({
  name: "reset_claude_session",
  description: `Reset Claude Code's session and start with a fresh context.
Use this when:
- Claude seems stuck in a loop or confused
- The context has become polluted with irrelevant information
- You want to retry an approach with a clean slate
- Claude is giving inconsistent or contradictory responses

This will clear all previous conversation history with Claude.
The next send_to_claude call will start a completely new session.`,
  parameters: z.object({
    reason: z.string().describe("Brief explanation of why the session is being reset"),
  }),
  execute: async ({ reason }) => {
    const previousSession = getSession();
    const previousCallCount = previousSession?.getCallCount() || 0;
    const previousSessionId = previousSession?.getSessionId() || "none";

    // Reset the session
    resetSession();

    console.log();
    console.log(c.primary("  [Session Reset]"));
    console.log(c.muted(`  Reason: ${reason}`));
    console.log(c.muted(`  Previous session: ${previousSessionId}... (${previousCallCount} calls)`));

    // Recreate session with the stored config
    if (lastSessionConfig) {
      const newSession = getOrCreateSession(lastSessionConfig);
      console.log(c.muted(`  New session: ${newSession.getSessionId()}`));
      console.log(c.primary("  [Session ready for fresh start]"));
      console.log();

      return {
        success: true,
        previousSessionId,
        previousCallCount,
        newSessionId: newSession.getSessionId(),
        message: "Session reset successfully. Next Claude call will use fresh context.",
      };
    }

    console.log(c.muted("  [!!] Warning: Session config not available, will be set on next call"));
    console.log();

    return {
      success: true,
      previousSessionId,
      previousCallCount,
      newSessionId: null,
      message: "Session cleared. New session will be created on next Claude call.",
    };
  },
});
