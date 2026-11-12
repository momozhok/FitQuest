import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingredients, recipes, matchRecipes } from "./recipes.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const hash = (s) => createHash("sha256").update(s).digest("hex");
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function createApp({
  dbPath = process.env.DB_PATH || join(root, "data/frigo.sqlite"),
  secureCookies = process.env.SECURE_COOKIES === "true",
} = {}) {
  if (dbPath !== ":memory:")
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS pantry(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,ingredient_id TEXT NOT NULL,quantity TEXT NOT NULL DEFAULT '',expires TEXT,PRIMARY KEY(user_id,ingredient_id));
 CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,recipe_id TEXT NOT NULL,PRIMARY KEY(user_id,recipe_id));
 CREATE TABLE IF NOT EXISTS groceries(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,checked INTEGER NOT NULL DEFAULT 0,UNIQUE(user_id,name));`);
  const limits = new Map();
  const stmt = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  function userFor(req) {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("frigo_session="))
      ?.slice(14);
    return token
      ? db
          .prepare(
            "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
          )
          .get(hash(token), Date.now())
      : null;
  }
  function session(res, id) {
    const token = randomBytes(32).toString("hex");
    run("DELETE FROM sessions WHERE expires<?", Date.now());
    run(
      "INSERT INTO sessions VALUES(?,?,?)",
      hash(token),
      id,
      Date.now() + 7 * 86400000,
    );
    res.setHeader(
      "Set-Cookie",
      `frigo_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secureCookies ? "; Secure" : ""}`,
    );
  }
  async function body(req) {
    let raw = "";
    for await (const c of req) {
      raw += c;
      if (Buffer.byteLength(raw) > 16384)
        throw new ApiError(413, "Données trop volumineuses.");
    }
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new ApiError(400, "Données invalides.");
    }
  }
  function text(v, max = 120) {
    if (typeof v !== "string" || !v.trim() || v.trim().length > max)
      throw new ApiError(400, "Champ manquant ou trop long.");
    return v.trim();
  }
  const ids = new Set(ingredients.map((i) => i.id));
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost"),
        path = url.pathname,
        method = req.method;
      if (path === "/api/health") return send(200, { status: "ok" });
      if (!path.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(method))
          throw new ApiError(405, "Méthode non autorisée.");
        const relative = decodeURIComponent(
          path === "/" ? "/index.html" : path,
        );
        const file = resolve(root, "public", "." + relative),
          base = resolve(root, "public");
        if (!file.startsWith(base + "/") && !file.startsWith(base + "\\"))
          throw new ApiError(404, "Page introuvable.");
        if (!existsSync(file)) throw new ApiError(404, "Page introuvable.");
        const mime =
          {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".webp": "image/webp",
            ".png": "image/png",
            ".svg": "image/svg+xml",
          }[extname(file)] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": mime,
          "Cache-Control": "no-cache",
        });
        return res.end(method === "HEAD" ? undefined : readFileSync(file));
      }
      if (!["GET", "HEAD"].includes(method)) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host)
          throw new ApiError(403, "Origine non autorisée.");
        if (req.headers["sec-fetch-site"] === "cross-site")
          throw new ApiError(403, "Origine non autorisée.");
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw new ApiError(415, "Format JSON requis.");
      }
      if (path === "/api/ingredients" && method === "GET")
        return send(200, ingredients);
      if (
        ["/api/auth/register", "/api/auth/login"].includes(path) &&
        method === "POST"
      ) {
        // Socket IP is intentional: do not trust spoofable forwarded headers.
        const ip = req.socket.remoteAddress || "local",
          now = Date.now();
        for (const [k, v] of limits) if (v.until < now) limits.delete(k);
        const rate = limits.get(ip) || { count: 0, until: now + 600000 };
        rate.count++;
        limits.set(ip, rate);
        if (rate.count > 30)
          throw new ApiError(
            429,
            "Trop de tentatives. Réessaie dans quelques minutes.",
          );
        const b = await body(req),
          email = text(b.email, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new ApiError(400, "Adresse e-mail invalide.");
        if (
          typeof b.password !== "string" ||
          b.password.length < 10 ||
          b.password.length > 128
        )
          throw new ApiError(
            400,
            "Le mot de passe doit contenir entre 10 et 128 caractères.",
          );
        let user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
        if (path.endsWith("/register")) {
          const name = text(b.name, 60);
          if (user)
            throw new ApiError(409, "Un compte utilise déjà cette adresse.");
          const salt = randomBytes(16).toString("hex"),
            password =
              salt + ":" + scryptSync(b.password, salt, 64).toString("hex");
          const result = run(
            "INSERT INTO users(email,name,password) VALUES(?,?,?)",
            email,
            name,
            password,
          );
          user = { id: Number(result.lastInsertRowid), name, email };
          db.exec("BEGIN");
          try {
            for (const id of [
              "tomate",
              "oeuf",
              "courgette",
              "feta",
              "pates",
              "creme",
            ])
              run(
                "INSERT INTO pantry(user_id,ingredient_id) VALUES(?,?)",
                user.id,
                id,
              );
            db.exec("COMMIT");
          } catch (e) {
            db.exec("ROLLBACK");
            throw e;
          }
        } else {
          const [salt, key] = (user?.password || "dummy:").split(":");
          const candidate = scryptSync(b.password, salt, 64);
          if (
            !user ||
            !key ||
            !timingSafeEqual(candidate, Buffer.from(key, "hex"))
          )
            throw new ApiError(401, "Adresse ou mot de passe incorrect.");
        }
        session(res, user.id);
        return send(200, { id: user.id, name: user.name, email: user.email });
      }
      const user = userFor(req);
      if (!user)
        throw new ApiError(401, "Connecte-toi pour retrouver ta cuisine.");
      if (path === "/api/auth/me" && method === "GET") return send(200, user);
      if (path === "/api/auth/logout" && method === "POST") {
        const token = (req.headers.cookie || "")
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("frigo_session="))
          ?.slice(14);
        if (token) run("DELETE FROM sessions WHERE token=?", hash(token));
        res.setHeader(
          "Set-Cookie",
          `frigo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies ? "; Secure" : ""}`,
        );
        return send(200, { ok: true });
      }
      if (path === "/api/pantry" && method === "GET")
        return send(
          200,
          stmt(
            "SELECT ingredient_id,quantity,expires FROM pantry WHERE user_id=?",
            user.id,
          ),
        );
      if (path === "/api/pantry" && method === "POST") {
        const b = await body(req);
        if (!ids.has(b.ingredient_id))
          throw new ApiError(400, "Ingrédient inconnu.");
        const quantity =
          typeof b.quantity === "string" ? b.quantity.trim() : "";
        if (quantity.length > 60)
          throw new ApiError(400, "Quantité trop longue.");
        const expires = b.expires || null;
        if (
          expires &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(expires) ||
            Number.isNaN(Date.parse(expires)) ||
            new Date(expires).toISOString().slice(0, 10) !== expires)
        )
          throw new ApiError(400, "Date invalide.");
        run(
          "INSERT INTO pantry VALUES(?,?,?,?) ON CONFLICT(user_id,ingredient_id) DO UPDATE SET quantity=excluded.quantity,expires=excluded.expires",
          user.id,
          b.ingredient_id,
          quantity,
          expires,
        );
        return send(200, { ok: true });
      }
      if (path.startsWith("/api/pantry/") && method === "DELETE") {
        run(
          "DELETE FROM pantry WHERE user_id=? AND ingredient_id=?",
          user.id,
          decodeURIComponent(path.slice(12)),
        );
        return send(200, { ok: true });
      }
      if (path === "/api/recipes" && method === "GET") {
        const time = Number(url.searchParams.get("time") || 0);
        if (!Number.isFinite(time) || time < 0)
          throw new ApiError(400, "Durée invalide.");
        // Expired ingredients are visible in the fridge but excluded from recipe matching.
        const today = new Date().toISOString().slice(0, 10),
          pantry = stmt(
            "SELECT ingredient_id FROM pantry WHERE user_id=? AND (expires IS NULL OR expires>=?)",
            user.id,
            today,
          );
        return send(
          200,
          matchRecipes(pantry, {
            time,
            vegetarian: url.searchParams.get("vegetarian") === "true",
            q: (url.searchParams.get("q") || "").slice(0, 120),
          }),
        );
      }
      if (path === "/api/favorites" && method === "GET")
        return send(
          200,
          stmt("SELECT recipe_id FROM favorites WHERE user_id=?", user.id).map(
            (x) => x.recipe_id,
          ),
        );
      if (
        path.startsWith("/api/favorites/") &&
        ["PUT", "DELETE"].includes(method)
      ) {
        const id = decodeURIComponent(path.slice(15));
        if (!recipes.some((r) => r.id === id))
          throw new ApiError(404, "Recette introuvable.");
        if (method === "PUT")
          run("INSERT OR IGNORE INTO favorites VALUES(?,?)", user.id, id);
        else
          run(
            "DELETE FROM favorites WHERE user_id=? AND recipe_id=?",
            user.id,
            id,
          );
        return send(200, { ok: true });
      }
      if (path === "/api/groceries" && method === "GET")
        return send(
          200,
          stmt(
            "SELECT id,name,checked FROM groceries WHERE user_id=? ORDER BY checked,id DESC",
            user.id,
          ),
        );
      if (path === "/api/groceries" && method === "POST") {
        const b = await body(req);
        const names = b.names || [b.name];
        if (!Array.isArray(names) || names.length > 40)
          throw new ApiError(400, "Liste invalide.");
        const clean = names.map((n) => text(n, 100));
        db.exec("BEGIN");
        try {
          for (const name of clean)
            run(
              "INSERT OR IGNORE INTO groceries(user_id,name) VALUES(?,?)",
              user.id,
              name,
            );
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return send(200, { ok: true });
      }
      if (
        /^\/api\/groceries\/\d+$/.test(path) &&
        ["PATCH", "DELETE"].includes(method)
      ) {
        const id = Number(path.split("/").at(-1));
        if (method === "DELETE")
          run("DELETE FROM groceries WHERE user_id=? AND id=?", user.id, id);
        else {
          const b = await body(req);
          if (typeof b.checked !== "boolean")
            throw new ApiError(400, "Valeur invalide.");
          run(
            "UPDATE groceries SET checked=? WHERE user_id=? AND id=?",
            b.checked ? 1 : 0,
            user.id,
            id,
          );
        }
        return send(200, { ok: true });
      }
      throw new ApiError(404, "Ressource introuvable.");
    } catch (e) {
      if (!e.status) console.error("Request failed", e.message);
      if (!res.headersSent)
        send(e.status || 500, {
          error: e.status
            ? e.message
            : "Une erreur est survenue. Réessaie dans un instant.",
        });
      else res.end();
    }
  });
  return { server, db };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { server, db } = createApp();
  const port = Number(process.env.PORT || 8080);
  server.listen(port, "0.0.0.0", () =>
    console.log(`Le Frigo : http://localhost:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(() => {
        db.close();
        process.exit(0);
      }),
    );
}
