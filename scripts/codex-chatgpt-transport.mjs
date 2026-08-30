import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CODEX_CHATGPT_PROVIDER = "codex-chatgpt-login";
export const CODEX_SOL_MODEL = "gpt-5.6-sol";
export const CODEX_SOL_REASONING = "medium";

function codexInvocation() {
  const explicit = process.env.CODEX_BIN?.trim();
  if (explicit) return { command: explicit, prefix: [] };
  return { command: "npm", prefix: ["exec", "--yes", "@openai/codex", "--"] };
}

function promptFromMessages(messages, stage) {
  const transcript = (Array.isArray(messages) ? messages : []).map((message) => (
    `${String(message?.role ?? "user").toUpperCase()}:\n${String(message?.content ?? "")}`
  )).join("\n\n");
  return [
    "You are the model transport for one isolated CMath workflow stage.",
    `Stage: ${stage}`,
    "Do not inspect files, call tools, or alter the workspace.",
    "Follow the supplied prompt and return only its requested final content. When it requests JSON, return only JSON without Markdown fences.",
    transcript,
  ].join("\n\n");
}

export function createCodexChatGPTChat({ timeoutMs = 20 * 60 * 1000, onCall } = {}) {
  return async function codexChat({ stage = "model", messages, model, reasoningEffort } = {}) {
    if (model !== CODEX_SOL_MODEL || reasoningEffort !== CODEX_SOL_REASONING) {
      throw new Error(`Codex ChatGPT transport only permits ${CODEX_SOL_MODEL}/${CODEX_SOL_REASONING}`);
    }
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cmath-codex-chat-"));
    const outputPath = path.join(temporaryDirectory, "last-message.txt");
    const invocation = codexInvocation();
    const args = [
      ...invocation.prefix,
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--sandbox", "read-only",
      "--cd", temporaryDirectory,
      "--model", CODEX_SOL_MODEL,
      "--config", `model_reasoning_effort=\"${CODEX_SOL_REASONING}\"`,
      "--output-last-message", outputPath,
      promptFromMessages(messages, stage),
    ];
    const startedAt = Date.now();
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(invocation.command, args, { cwd: temporaryDirectory, stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`Codex ChatGPT stage ${stage} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("exit", (code, signal) => {
          clearTimeout(timer);
          if (code === 0) resolve();
          else reject(new Error(`Codex ChatGPT stage ${stage} failed (${code ?? signal}): ${stderr.slice(-1000)}`));
        });
      });
      if (!fs.existsSync(outputPath)) throw new Error(`Codex ChatGPT stage ${stage} returned no final message`);
      const content = fs.readFileSync(outputPath, "utf8").trim();
      if (!content) throw new Error(`Codex ChatGPT stage ${stage} returned an empty final message`);
      onCall?.({ stage, provider: CODEX_CHATGPT_PROVIDER, model, reasoningEffort, durationMs: Date.now() - startedAt });
      return { content, status: 200 };
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  };
}
