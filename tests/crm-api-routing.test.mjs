import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "vite";

test("login, CSRF y API usan el mismo backend local configurado para SSR", async () => {
  const original = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = "http://127.0.0.1:8123";
  try {
    const config = await resolveConfig({}, "serve", "development");
    assert.equal(config.server.proxy["/api"].target, "http://127.0.0.1:8123");
    assert.equal(config.server.proxy["/sanctum"].target, "http://127.0.0.1:8123");
    assert.equal(config.server.proxy["/__public-api"].target, "http://127.0.0.1:8123");
  } finally {
    if (original === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = original;
  }
});
