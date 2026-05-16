import { cpSync, createReadStream, existsSync, statSync } from "fs";
import path from "path";
import type { Connect, Plugin } from "vite";

const MINTIMER_MOUNT = "/mintimer_game";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
};

function mintimerMiddleware(root: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const raw = req.url?.split("?")[0] ?? "/";
    const rel = raw === MINTIMER_MOUNT || raw === `${MINTIMER_MOUNT}/`
      ? "/index.html"
      : raw.startsWith(`${MINTIMER_MOUNT}/`)
        ? raw.slice(MINTIMER_MOUNT.length)
        : null;

    if (rel === null) {
      next();
      return;
    }

    const filePath = path.join(root, rel);
    if (!filePath.startsWith(root)) {
      res.statusCode = 403;
      res.end();
      return;
    }

    let target = filePath;
    try {
      const st = statSync(target);
      if (st.isDirectory()) target = path.join(target, "index.html");
    } catch {
      next();
      return;
    }

    if (!existsSync(target)) {
      next();
      return;
    }

    const ext = path.extname(target).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    createReadStream(target).pipe(res);
  };
}

/** Раздаёт mintimer_game/ в dev/preview и копирует в dist при сборке. */
export function mintimerGamePlugin(): Plugin {
  const root = path.resolve(__dirname, "mintimer_game");

  const attach = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(mintimerMiddleware(root));
  };

  return {
    name: "mintimer-game-static",
    configureServer: attach,
    configurePreviewServer: attach,
    closeBundle() {
      const out = path.resolve(__dirname, "dist", "mintimer_game");
      cpSync(root, out, { recursive: true });
    },
  };
}
