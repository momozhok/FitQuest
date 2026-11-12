import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server.mjs";

async function setup(t, dbPath = ":memory:") {
  const app = createApp({ dbPath });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  t.after(
    () =>
      new Promise((r) =>
        app.server.close(() => {
          app.db.close();
          r();
        }),
      ),
  );
  const base = "http://127.0.0.1:" + app.server.address().port;
  async function request(
    path,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return {
      response,
      data,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const register = (email = "cook@example.com") =>
    request("/api/auth/register", {
      method: "POST",
      body: { name: "Camille", email, password: "une-bonne-recette-42" },
    });
  return { ...app, request, register, base };
}
test("Accounts, session cookies, login, logout and validation", async (t) => {
  const { request, register } = await setup(t);
  assert.equal((await request("/api/pantry")).response.status, 401);
  assert.equal(
    (
      await request("/api/auth/register", {
        method: "POST",
        body: { name: "A", email: "invalid", password: "x" },
      })
    ).response.status,
    400,
  );
  const reg = await register();
  assert.equal(reg.response.status, 200);
  assert.match(
    reg.response.headers.get("set-cookie"),
    /HttpOnly; SameSite=Lax/,
  );
  assert.ok(!reg.data.password);
  assert.equal((await register()).response.status, 409);
  assert.equal(
    (await request("/api/auth/me", { cookie: reg.cookie })).data.name,
    "Camille",
  );
  assert.equal(
    (
      await request("/api/auth/login", {
        method: "POST",
        body: { email: "cook@example.com", password: "bad-password-00" },
      })
    ).response.status,
    401,
  );
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: "COOK@example.com", password: "une-bonne-recette-42" },
  });
  assert.equal(login.response.status, 200);
  await request("/api/auth/logout", {
    method: "POST",
    cookie: reg.cookie,
    body: {},
  });
  assert.equal(
    (await request("/api/auth/me", { cookie: reg.cookie })).response.status,
    401,
  );
  assert.equal(
    (await request("/api/auth/me", { cookie: login.cookie })).response.status,
    200,
  );
});
test("Pantry quantity/date updates, expiration, filtering and ordering", async (t) => {
  const { request, register } = await setup(t);
  const { cookie } = await register();
  assert.equal((await request("/api/pantry", { cookie })).data.length, 6);
  let result = await request("/api/recipes", { cookie });
  assert.ok(result.data.length >= 12);
  assert.equal(
    result.data.find((r) => r.id === "pates-feta").missing.length,
    0,
  );
  assert.equal(
    (
      await request("/api/pantry", {
        method: "POST",
        cookie,
        body: { ingredient_id: "unknown" },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await request("/api/pantry", {
        method: "POST",
        cookie,
        body: { ingredient_id: "tomate", expires: "2026-02-30" },
      })
    ).response.status,
    400,
  );
  await request("/api/pantry", {
    method: "POST",
    cookie,
    body: { ingredient_id: "tomate", quantity: "500 g", expires: "2001-01-01" },
  });
  result = await request("/api/recipes", { cookie });
  assert.ok(
    result.data
      .find((r) => r.id === "pates-feta")
      .missing.some((i) => i.id === "tomate"),
  );
  assert.equal(
    (await request("/api/pantry", { cookie })).data.find(
      (p) => p.ingredient_id === "tomate",
    ).quantity,
    "500 g",
  );
  const filtered = (
    await request("/api/recipes?time=15&vegetarian=true", { cookie })
  ).data;
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((r) => r.time <= 15 && r.vegetarian));
  assert.equal(
    (await request("/api/recipes?time=bad", { cookie })).response.status,
    400,
  );
  for (let i = 1; i < result.data.length; i++)
    assert.ok(
      result.data[i].missing.length >= result.data[i - 1].missing.length,
    );
  await request("/api/pantry/tomate", { method: "DELETE", cookie, body: {} });
  assert.ok(
    !(await request("/api/pantry", { cookie })).data.some(
      (i) => i.ingredient_id === "tomate",
    ),
  );
});
test("Favorites and shopping are isolated between accounts, deduplicated and editable", async (t) => {
  const { request, register } = await setup(t);
  const a = (await register("a@example.com")).cookie,
    b = (await register("b@example.com")).cookie;
  await request("/api/favorites/pates-feta", {
    method: "PUT",
    cookie: a,
    body: {},
  });
  assert.deepEqual((await request("/api/favorites", { cookie: a })).data, [
    "pates-feta",
  ]);
  assert.deepEqual((await request("/api/favorites", { cookie: b })).data, []);
  await request("/api/groceries", {
    method: "POST",
    cookie: a,
    body: { names: ["Farine", "Yaourt", "Farine"] },
  });
  const list = (await request("/api/groceries", { cookie: a })).data;
  assert.equal(list.length, 2);
  assert.equal((await request("/api/groceries", { cookie: b })).data.length, 0);
  await request("/api/groceries/" + list[0].id, {
    method: "PATCH",
    cookie: b,
    body: { checked: true },
  });
  assert.equal(
    (await request("/api/groceries", { cookie: a })).data.find(
      (x) => x.id === list[0].id,
    ).checked,
    0,
  );
  await request("/api/groceries/" + list[0].id, {
    method: "PATCH",
    cookie: a,
    body: { checked: true },
  });
  assert.equal(
    (await request("/api/groceries", { cookie: a })).data.find(
      (x) => x.id === list[0].id,
    ).checked,
    1,
  );
  await request("/api/groceries/" + list[0].id, {
    method: "DELETE",
    cookie: a,
    body: {},
  });
  assert.equal((await request("/api/groceries", { cookie: a })).data.length, 1);
  await request("/api/favorites/pates-feta", {
    method: "DELETE",
    cookie: a,
    body: {},
  });
  assert.deepEqual((await request("/api/favorites", { cookie: a })).data, []);
  await request("/api/pantry/oeuf", { method: "DELETE", cookie: a, body: {} });
  assert.equal((await request("/api/pantry", { cookie: b })).data.length, 6);
});
test("Cross-origin writes, oversized bodies and unknown recipes are rejected", async (t) => {
  const { request, register } = await setup(t);
  const { cookie } = await register();
  assert.equal(
    (
      await request("/api/groceries", {
        method: "POST",
        cookie,
        headers: { Origin: "https://evil.example" },
        body: { name: "spam" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request("/api/groceries", {
        method: "POST",
        cookie,
        body: { name: "x".repeat(17000) },
      })
    ).response.status,
    413,
  );
  assert.equal(
    (
      await request("/api/groceries", {
        method: "POST",
        cookie,
        body: { names: ["Ok", ""] },
      })
    ).response.status,
    400,
  );
  assert.equal((await request("/api/groceries", { cookie })).data.length, 0);
  assert.equal(
    (
      await request("/api/favorites/missing", {
        method: "PUT",
        cookie,
        body: {},
      })
    ).response.status,
    404,
  );
});
test("Data and sessions survive reopening the SQLite database", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "frigo-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "test.sqlite");
  const first = createApp({ dbPath: path });
  await new Promise((r) => first.server.listen(0, "127.0.0.1", r));
  let cookie;
  try {
    const reg = await fetch(
      "http://127.0.0.1:" + first.server.address().port + "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          email: "persist@example.com",
          password: "mot-de-passe-solide",
        }),
      },
    );
    assert.equal(reg.status, 200);
    cookie = reg.headers.get("set-cookie").split(";")[0];
  } finally {
    await new Promise((r) => first.server.close(r));
    first.db.close();
  }
  const second = createApp({ dbPath: path });
  await new Promise((r) => second.server.listen(0, "127.0.0.1", r));
  try {
    const r = await fetch(
      "http://127.0.0.1:" + second.server.address().port + "/api/pantry",
      { headers: { Cookie: cookie } },
    );
    assert.equal(r.status, 200);
    assert.equal((await r.json()).length, 6);
  } finally {
    await new Promise((r) => second.server.close(r));
    second.db.close();
  }
});
test("Static frontend, CSP and health endpoint are served", async (t) => {
  const { base, request } = await setup(t);
  assert.equal((await request("/api/health")).data.status, "ok");
  const r = await fetch(base);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(await r.text(), /Le Frigo/);
  for (const path of [
    "/style.css",
    "/app.js",
    "/favicon.svg",
    "/images/recipes.webp",
  ])
    assert.equal((await fetch(base + path)).status, 200, path);
});
