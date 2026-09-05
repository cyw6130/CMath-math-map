import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);

test("page assets and navigation stay inside the published project after relocation", () => {
  const project = new URL("https://example.test/CMath-math-map/");
  for (const page of ["index.html", "index-v5.html", ...readdirSync(new URL("pages/", root)).filter(name => name.endsWith(".html")).map(name => `pages/${name}`)]) {
    const html = readFileSync(new URL(page, root), "utf8");
    const base = new URL(html.match(/<base\s+href="([^"]+)"/u)?.[1] || page, new URL(page, project));
    for (const match of html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gu, "$1</script>").matchAll(/<(script|img|link|a)\b[^>]*?\b(?:src|href)="([^"]+)"/gu)) {
      const target = new URL(match[2], base);
      if (target.origin !== project.origin) continue;
      assert.ok(target.pathname.startsWith(project.pathname), `${page}: ${match[2]} leaves the project`);
      const relative = decodeURIComponent(target.pathname.slice(project.pathname.length)) || "index.html";
      assert.ok(existsSync(new URL(relative, root)), `${page}: missing ${relative}`);
      if (match[1] === "a" && target.hash && !target.search) {
        const destination = readFileSync(new URL(relative, root), "utf8");
        assert.ok(destination.includes(`id="${target.hash.slice(1)}"`), `${page}: missing anchor ${match[2]}`);
      }
    }
  }
});
