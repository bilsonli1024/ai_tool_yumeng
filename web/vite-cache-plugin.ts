/**
 * Vite 开发服务器插件：为 AI 生成结果提供服务端文件缓存 API
 *
 * POST /api/cache/save  { key, data }  → 写入 public/cache/{key}.json
 * GET  /api/cache/load?key=xxx         → 读取 public/cache/{key}.json
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

const MAX_BODY = 80 * 1024 * 1024; // 80 MB（7张 base64 图片约 20-50 MB）

function jsonRes(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** 仅允许小写十六进制字符串，防止路径穿越 */
function isValidKey(key: string) {
  return /^[a-f0-9]{8,32}$/.test(key);
}

export function cachePlugin(): Plugin {
  return {
    name: 'ai-cache-api',
    configureServer(server) {
      // 确保缓存目录存在（相对于 npm run dev 的工作目录，即 web/）
      const cacheDir = path.resolve(process.cwd(), 'public/cache');
      fs.mkdirSync(cacheDir, { recursive: true });

      server.middlewares.use(
        '/api/cache',
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? '/';

          // ── POST /api/cache/save ──────────────────────
          if (req.method === 'POST' && url === '/save') {
            const chunks: Buffer[] = [];
            let size = 0;
            let aborted = false;

            req.on('data', (chunk: Buffer) => {
              size += chunk.length;
              if (size > MAX_BODY) {
                aborted = true;
                jsonRes(res, 413, { error: 'payload too large' });
                req.destroy();
                return;
              }
              chunks.push(chunk);
            });

            req.on('end', () => {
              if (aborted) return;
              try {
                const { key, data } = JSON.parse(
                  Buffer.concat(chunks).toString('utf-8'),
                ) as { key: string; data: unknown };

                if (!isValidKey(key)) {
                  jsonRes(res, 400, { error: 'invalid key' });
                  return;
                }

                fs.writeFileSync(
                  path.join(cacheDir, `${key}.json`),
                  JSON.stringify(data),
                  'utf-8',
                );
                jsonRes(res, 200, { ok: true });
              } catch (e) {
                jsonRes(res, 500, { error: String(e) });
              }
            });

            req.on('error', () => { /* destroyed above */ });
            return;
          }

          // ── GET /api/cache/load?key=xxx ───────────────
          if (req.method === 'GET' && url.startsWith('/load')) {
            const qi = url.indexOf('?');
            const params = new URLSearchParams(qi >= 0 ? url.slice(qi + 1) : '');
            const key = params.get('key') ?? '';

            if (!isValidKey(key)) {
              jsonRes(res, 400, { error: 'invalid key' });
              return;
            }

            const file = path.join(cacheDir, `${key}.json`);
            if (!fs.existsSync(file)) {
              jsonRes(res, 404, { error: 'not found' });
              return;
            }

            try {
              jsonRes(res, 200, {
                ok: true,
                data: JSON.parse(fs.readFileSync(file, 'utf-8')),
              });
            } catch (e) {
              jsonRes(res, 500, { error: String(e) });
            }
            return;
          }

          next();
        },
      );
    },
  };
}

