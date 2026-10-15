// Tiny local receiver: the browser pane posts finished pictures here, they are saved into raw/images.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("raw/images");
fs.mkdirSync(dir, { recursive: true });
http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  const name = path.basename(new URL(req.url, "http://x").searchParams.get("name") ?? "");
  if (!/^[a-z0-9-]+\.(png|jpg)$/i.test(name)) { res.statusCode = 400; return res.end("bad name"); }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => { fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks)); console.log("saved", name); res.end("ok"); });
}).listen(8099, "127.0.0.1");
