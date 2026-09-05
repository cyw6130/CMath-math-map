(() => {
  "use strict";
  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.get("preview") !== "ai") return;
  const sessionKey = pageUrl.searchParams.get("session");
  if (!sessionKey) return;
  document.documentElement.dataset.aiMapEmbed = pageUrl.searchParams.get("embed") === "1" ? "true" : "false";
  const source = window.sessionStorage.getItem(sessionKey);
  if (!source) return;
  try {
    const parsed = JSON.parse(source);
    const data = parsed?.projectView ?? parsed;
    window.CMATH_AI_MAP_SESSION = Object.freeze({
      sessionKey,
      data,
      understandingProfile: parsed?.understandingProfile ?? null,
    });
  } catch {
    window.CMATH_AI_MAP_SESSION = Object.freeze({ sessionKey, error: "当前会话数学地图无法解析" });
  }
})();
