import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => vite.close());
const { CrmLayout } = await vite.ssrLoadModule("/src/modules/crm/layout/CrmLayout.tsx");
const { UserHomePage } = await vite.ssrLoadModule("/src/modules/crm/home/UserHomePage.tsx");
const { MyInventoryPage } = await vite.ssrLoadModule("/src/modules/crm/my-commerce/MyInventoryPage.tsx");
const permissions = [
  "notifications.view", "notifications.update", "business_overview.view", "inventory.view_own",
  "quotations.view_own", "quotations.create_own", "quotations.update_own",
  "quotations.send_own", "quotations.convert_own", "orders.view_own",
  "orders.create_own", "orders.confirm_own", "orders.complete_own", "payments.create_own",
];
const user = {
  id: 1, name: "Comercial QA", email: "local@example.test", role: "user", permissions,
  employee: { id: 1, name: "Comercial QA", branch_id: 1, branch: { id: 1, code: "BAQ", name: "Barranquilla" } },
};
function asUser(value, run) {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  globalThis.window = { location: { pathname: "/crm/me/inventory" }, matchMedia: () => ({ matches: false }) };
  globalThis.sessionStorage = { getItem: () => JSON.stringify(value) };
  try { return run(); } finally { globalThis.window = originalWindow; globalThis.sessionStorage = originalStorage; }
}
test("Usuario encuentra inventario, cotizaciones y ventas sin navegación administrativa", () => asUser(user, () => {
  const html = renderToString(createElement(CrmLayout));
  for (const path of ["/crm/me/inventory", "/crm/me/quotations", "/crm/me/sales"]) assert.ok(html.includes('href="' + path + '"'));
  for (const path of ["/crm/inventory/movements", "/crm/inventory/transfers", "/crm/users", "/crm/settings", "/crm/catalog"]) assert.ok(!html.includes('href="' + path + '"'));
  const home = renderToString(createElement(UserHomePage));
  assert.ok(home.includes("Consultar inventario"));
  assert.ok(home.includes("Mis cotizaciones"));
  assert.ok(home.includes("Mis ventas"));
}));
test("inventario requiere sede y no ofrece controles de modificación", () => {
  const html = asUser(user, () => renderToString(createElement(MyInventoryPage)));
  assert.ok(html.includes("Barranquilla"));
  assert.ok(html.includes("solo lectura"));
  assert.ok(html.includes("Buscar producto, variante o SKU"));
  assert.ok(!html.includes("Transferir"));
  const missing = asUser({ ...user, employee: null }, () => renderToString(createElement(MyInventoryPage)));
  assert.ok(missing.includes("empleado activo con sede asignada"));
});
test("la navegación conserva accesos del administrador y oculta módulos sin permiso", () => {
  const admin = asUser({ ...user, role: "admin", permissions: ["inventory.view", "orders.view", "quotations.view", "settings.view", "users.view"] }, () => renderToString(createElement(CrmLayout)));
  for (const path of ["/crm/inventory", "/crm/orders", "/crm/quotations", "/crm/settings"]) assert.ok(admin.includes('href="' + path + '"'));
  const denied = asUser({ ...user, permissions: [] }, () => renderToString(createElement(CrmLayout)));
  for (const path of ["/crm/me/inventory", "/crm/me/quotations", "/crm/me/sales"]) assert.ok(!denied.includes('href="' + path + '"'));
});
