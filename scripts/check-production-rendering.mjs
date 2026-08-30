import { pathToFileURL } from "node:url";

export const DEFAULT_PRODUCTION_URL = "https://cyw6130.github.io/CMath-math-map/";
export const EXPECTED_ADAPTER_ID = "cmath-math-map.math-rendering-consumer/v1";

export function inspectRenderingDeployment(html, assetSource) {
  const scriptMatch = String(html).match(/<script\s+[^>]*src=["'](math-rendering-consumer\.js\?v=[^"']+)["'][^>]*><\/script>/u);
  if (!scriptMatch) {
    throw new Error("线上入口尚未加载带版本指纹的 math-rendering-consumer.js");
  }
  if (!String(assetSource).includes(EXPECTED_ADAPTER_ID)) {
    throw new Error(`线上数学渲染适配器身份不匹配：期望 ${EXPECTED_ADAPTER_ID}`);
  }
  return { assetPath: scriptMatch[1], adapterId: EXPECTED_ADAPTER_ID };
}

export async function checkProductionRendering(baseUrl = DEFAULT_PRODUCTION_URL, fetchImpl = globalThis.fetch) {
  const rootUrl = new URL(baseUrl);
  const cacheBust = `rendering-check-${Date.now()}`;
  rootUrl.searchParams.set("_", cacheBust);
  const htmlResponse = await fetchImpl(rootUrl, { cache: "no-store" });
  if (!htmlResponse.ok) throw new Error(`无法读取线上入口：HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const scriptMatch = html.match(/<script\s+[^>]*src=["'](math-rendering-consumer\.js\?v=[^"']+)["'][^>]*><\/script>/u);
  if (!scriptMatch) return inspectRenderingDeployment(html, "");

  const assetUrl = new URL(scriptMatch[1], rootUrl);
  assetUrl.searchParams.set("_", cacheBust);
  const assetResponse = await fetchImpl(assetUrl, { cache: "no-store" });
  if (!assetResponse.ok) throw new Error(`无法读取线上数学渲染适配器：HTTP ${assetResponse.status}`);
  return inspectRenderingDeployment(html, await assetResponse.text());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkProductionRendering(process.argv[2]);
  console.log(`数学渲染部署检查通过：${result.adapterId} · ${result.assetPath}`);
}
