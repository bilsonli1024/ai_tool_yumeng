/**
 * AI 生成结果缓存服务
 * 优先使用 localStorage；容量或权限不足时，自动 fallback 到服务端文件
 * （服务端接口由 vite-cache-plugin.ts 提供，存储于 public/cache/{key}.json）
 */

const API_BASE = '/api/cache';

// ── 生成缓存 Key ──────────────────────────────────────────

/**
 * 根据输入对象生成 16 位十六进制缓存 Key（SHA-256 前 16 位）
 * 相同输入 → 相同 Key，可跨会话命中缓存
 */
export async function generateCacheKey(
  inputs: Record<string, unknown>,
): Promise<string> {
  const sorted = Object.fromEntries(
    Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b)),
  );
  const data = new TextEncoder().encode(JSON.stringify(sorted));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

// ── LocalStorage ──────────────────────────────────────────

/** 写入 localStorage，配额不足返回 false */
export function lsSave(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(
      `ai_${key}`,
      JSON.stringify({ v: data, t: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

/** 从 localStorage 读取，不存在或解析失败返回 null */
export function lsLoad<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`ai_${key}`);
    return raw ? (JSON.parse(raw) as { v: T }).v : null;
  } catch {
    return null;
  }
}

// ── 服务端 API ────────────────────────────────────────────

async function serverSave(key: string, data: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function serverLoad<T>(key: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}/load?key=${encodeURIComponent(key)}`);
    if (!r.ok) return null;
    const json = (await r.json()) as { ok: boolean; data: T };
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

// ── 公共 API ──────────────────────────────────────────────

/** 保存缓存：优先 localStorage，配额不足则写服务端文件 */
export async function cacheSet(key: string, data: unknown): Promise<void> {
  if (!lsSave(key, data)) {
    await serverSave(key, data);
  }
}

/** 读取缓存：优先 localStorage，未命中则从服务端文件读取 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = lsLoad<T>(key);
  return local !== null ? local : serverLoad<T>(key);
}

