import { cpSync, createReadStream, existsSync, statSync } from "fs";
import path from "path";
import type { Connect, Plugin } from "vite";

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
  ".glb": "model/gltf-binary",
};

const GAME_FOLDERS = [
  { mount: "/mintimer_game", dir: "mintimer_game" },
  { mount: "/rover_lidar", dir: "rover_lidar" },
] as const;

function staticFolderMiddleware(
  mount: string,
  root: string
): Connect.NextHandleFunction {
  return (req, res, next) => {
    const raw = req.url?.split("?")[0] ?? "/";
    const rel =
      raw === mount || raw === `${mount}/`
        ? "/index.html"
        : raw.startsWith(`${mount}/`)
          ? raw.slice(mount.length)
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

/** Раздаёт mintimer_game/ и rover_lidar/ в dev/preview и копирует в dist при сборке. */
export function staticGamesPlugin(): Plugin {
  const roots = GAME_FOLDERS.map(({ mount, dir }) => ({
    mount,
    root: path.resolve(__dirname, dir),
  }));

  const attach = (server: { middlewares: Connect.Server }) => {
    for (const { mount, root } of roots) {
      server.middlewares.use(staticFolderMiddleware(mount, root));
    }
  };

  return {
    name: "static-games",
    configureServer: attach,
    configurePreviewServer: attach,
    closeBundle() {
      for (const { dir } of GAME_FOLDERS) {
        const src = path.resolve(__dirname, dir);
        const out = path.resolve(__dirname, "dist", dir);
        cpSync(src, out, { recursive: true });
      }
    },
  };
}
