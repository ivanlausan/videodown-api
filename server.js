import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(",").map(s => s.trim()) }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "videodown-api" }));

const mediaExtensions = /\.(mp4|m4v|webm|mov|m4a|mp3|ogg|ogv|mkv)(?:$)/i;
function parsePublicHttpUrl(value) {
  let u;
  try { u = new URL(value); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol)) return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1" ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "0.0.0.0" || host.endsWith(".local")) return null;
  return u;
}

app.post("/api/inspect", (req, res) => {
  const u = parsePublicHttpUrl(req.body?.url);
  if (!u) return res.status(400).json({ error: "Introduce una URL pública HTTP o HTTPS válida." });

  const host = u.hostname.toLowerCase();
  if (/(^|\.)poww?video\./i.test(host)) {
    return res.json({
      kind: "powvideo",
      message: "Hemos reconocido Powvideo, pero todavía no hay un adaptador verificado para este proveedor. No vamos a intentar saltarnos sus controles ni extraer streams protegidos. Si Powvideo ofrece un enlace de descarga directo, pégalo aquí."
    });
  }

  if (mediaExtensions.test(u.pathname)) {
    const filename = decodeURIComponent(u.pathname.split("/").pop() || "video").slice(0, 180);
    return res.json({ kind: "direct", filename, downloadUrl: u.href });
  }

  return res.json({
    kind: "page",
    message: "Es una página web, no un enlace directo a un archivo multimedia. Hace falta una integración específica con ese sitio; esta versión no extrae reproductores incrustados."
  });
});

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.listen(PORT, "0.0.0.0", () => console.log(`VideoDown API escuchando en ${PORT}`));
