import fs from "node:fs";
import http from "node:http";

const key = JSON.parse(fs.readFileSync(`${process.env.HOME}/.gamma-math-map/keys.json`, "utf8")).providers.opencode.apiKey;
const text = "测试论文文本。" .repeat(2000);
const prompt = `你是数学论文结构化编辑器。只输出一个 JSON 对象，不要 Markdown。JSON 形状：{"projectTitle":"...","entries":[...],"inferences":[...]}。论文文本：\n${text}`;

function proxyRequest(payload, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request({ host: "127.0.0.1", port: 7100, path: "/api/model-proxy", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: timeoutMs }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 502, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["deepseek-v4-flash", "hy3", "minimax-m3", "qwen3.7-plus", "glm-5.1"];
for (const model of models) {
  const started = Date.now();
  try {
    const response = await proxyRequest({ targetUrl: "https://opencode.ai/zen/go/v1/chat/completions", apiKey: key, body: { model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 16000, stream: false } });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    let detail = "";
    try {
      const parsed = JSON.parse(response.body);
      if (parsed.error) detail = `ERROR: ${String(parsed.error.message ?? parsed.error).slice(0, 120)}`;
      else {
        const content = parsed.choices?.[0]?.message?.content ?? "";
        const finish = parsed.choices?.[0]?.finish_reason;
        detail = `content ${content.length} chars, finish=${finish}, entries=${(() => { try { return JSON.parse(content).entries?.length; } catch { return "?"; } })()}`;
      }
    } catch { detail = `non-JSON: ${response.body.slice(0, 120)}`; }
    console.log(`${model.padEnd(18)} ${seconds.padStart(7)}s  HTTP ${response.status}  ${detail}`);
  } catch (error) {
    console.log(`${model.padEnd(18)} FAILED after ${((Date.now() - started) / 1000).toFixed(1)}s: ${error.message}`);
  }
}
