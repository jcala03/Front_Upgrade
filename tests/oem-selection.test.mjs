import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { after } from "node:test";

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => vite.close());
const filters = await vite.ssrLoadModule("/src/pages/Shop/shopFilters.ts");

test("OEM conserva la tupla vehicular al serializar, recargar y volver al producto", () => {
  const query = "vehicle_brand_id=1&vehicle_model_id=2&vehicle_version_id=3&vehicle_multimedia_system_id=4&year=2016";
  const parsed = filters.parseShopFilters(query);
  assert.equal(parsed.vehicle_multimedia_system_id, "4");
  assert.equal(filters.parseShopFilters(filters.serializeShopFilters(parsed)).vehicle_multimedia_system_id, "4");
  assert.equal(filters.shopApiFilters(parsed).vehicle_multimedia_system_id, "4");
  assert.equal(filters.vehicleSelectionQuery(query + "&search=privado"), query);
  assert.ok(filters.shopUrl(parsed).includes("vehicle_multimedia_system_id=4"));
});

test("un OEM sin sus padres se descarta de la URL", () => {
  assert.equal(filters.parseShopFilters("vehicle_multimedia_system_id=4").vehicle_multimedia_system_id, "");
  assert.equal(filters.parseShopFilters("vehicle_brand_id=1&vehicle_model_id=2&vehicle_multimedia_system_id=4").vehicle_multimedia_system_id, "");
});
