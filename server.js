/* Minimal static dev server for Kimi Work preview.
   Forwards --host / --port CLI args (e.g. `npm run dev -- --port 7100`). */
const http = require("http");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.findIndex((a) => a === `--${name}`);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split("=")[1] : fallback;
}
const port = Number(argValue("port", process.env.PORT || 7100));
const host = argValue("host", "127.0.0.1");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const root = __dirname;
http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(root, urlPath === "/" ? "index-v5.html" : urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(port, host, () => {
    console.log(`CMath Math Map v3 → http://${host}:${port}/`);
  });
