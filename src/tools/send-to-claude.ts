// Send to Claude Tool
// Delegates work to the persistent Claude Code session

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import { getSession } from "./claude-session.js";

export const sendToClaudeTool = defineTool({
  name: "send_to_claude",
  description: `Send a prompt to Claude Code. Claude Code is an AI coding assistant that can:
- Read and write files
- Run shell commands
- Search code
- Make code changes
- Run tests and builds

The session persists across calls - Claude remembers previous context.
Use this to delegate coding work. Be specific about what you want done.`,
  parameters: z.object({
    prompt: z.string().describe("The prompt/instruction to send to Claude Code"),
  }),
  execute: async ({ prompt }) => {
    const session = getSession();
    if (!session) {
      return { success: false, error: "No active session. Call initialize first." };
    }

    const result = await session.send(prompt);

    return {
      success: result.success,
      output: result.output,
      exitCode: result.exitCode,
      callNumber: session.getCallCount(),
    };
  },
});
