// Test stand-ins: an in-memory version of the Netlify Blobs store, and helpers
// to make signed login cookies.
import { sign } from "../netlify/lib/session.mjs";

export function memoryStore() {
  const data = new Map();
  return {
    data,
    async get(key) { return data.has(key) ? structuredClone(data.get(key)) : null; },
    async setJSON(key, value) { data.set(key, structuredClone(value)); },
    async delete(key) { data.delete(key); },
    async list({ prefix = "" } = {}) {
      return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: "x" })), directories: [] };
    },
  };
}

export const SECRET = "test-secret-0123456789abcdef";

export function sessionCookie(user) {
  const token = sign({ ...user, exp: Date.now() + 60_000 }, SECRET);
  return `uw_session=${encodeURIComponent(token)}`;
}

export const MEMBER = { id: "111", name: "Dad", avatar: "https://cdn.discordapp.com/embed/avatars/1.png", member: true };
export const OTHER = { id: "222", name: "Sithofast", avatar: "https://cdn.discordapp.com/embed/avatars/2.png", member: true };
export const OUTSIDER = { id: "333", name: "Stranger", avatar: "", member: false };
export const MOD = { id: "999", name: "Mod", avatar: "", member: true };
