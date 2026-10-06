import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { allowedPublicProxyRequest } from "../scripts/public-dev-proxy.mjs";
const vite = await createServer({
  configFile: false,
  define: {
    __PUBLIC_SITE_URL__: JSON.stringify("https://upgradecolombia.com"),
  },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => vite.close());
const filters = await vite.ssrLoadModule("/src/pages/Shop/shopFilters.ts");
const booking = await vite.ssrLoadModule(
  "/src/components/sections/Contact/publicBooking.ts"
);
const presentation = await vite.ssrLoadModule(
  "/src/pages/ProductDetail/productPresentation.ts"
);
const { renderRequest } = await vite.ssrLoadModule("/src/seo/entry-server.tsx");
const { Contact } = await vite.ssrLoadModule(
  "/src/components/sections/Contact/Contact.tsx"
);
const { shippingQuoteErrorMessage, shippingQuoteActionLabel } = await vite.ssrLoadModule(
  "/src/pages/Checkout/CheckoutShippingQuotes.tsx"
);
const { PublicCheckoutError } = await vite.ssrLoadModule("/src/api/orders.ts");
const options = {
  siteUrl: "https://upgradecolombia.com",
  apiBase: "http://127.0.0.1:9999",
};
const template =
  '<html><head><!--seo-head--></head><body><div id="root"></div></body></html>';
const product = {
  id: 1,
  slug: "producto-real",
  name: "Producto real",
  is_active: true,
  is_visible: true,
  price: 10000,
  stock: 4,
  image_url: "https://example.com/primary.jpg",
  images: [],
  variants: [],
  vehicle_compatibilities: [],
  is_universal: true,
  compatibility_type: "universal",
};

test("defaults técnicos y sort no cuentan como filtros del comprador", () => {
  assert.equal(filters.activeShopFilterCount(filters.defaultShopFilters()), 0);
  assert.equal(
    filters.activeShopFilterCount(
      filters.parseShopFilters("?in_stock=1&sort=featured")
    ),
    0
  );
  assert.equal(
    filters.activeShopFilterCount(filters.parseShopFilters("?search=radio")),
    1
  );
  assert.equal(
    filters.activeShopFilterCount(
      filters.parseShopFilters("?category_id=4&vehicle_brand_id=3")
    ),
    2
  );
  assert.equal(
    filters.activeShopFilterCount(filters.parseShopFilters("?sort=price_asc")),
    0
  );
  assert.equal(
    filters.activeShopFilterCount(
      filters.parseShopFilters("?in_stock=0&featured=1")
    ),
    2
  );
  assert.equal(
    filters.activeShopFilterCount(
      filters.parseShopFilters("?specs[wireless]=0")
    ),
    1
  );
});
test("provider de envío no disponible conserva error legítimo y ofrece retry sin exponer excepciones", () => {
  const error = new PublicCheckoutError("Technical provider exception with private diagnostics", "PROVIDER_UNAVAILABLE");
  assert.equal(shippingQuoteErrorMessage(error, "fallback"), "No pudimos obtener tarifas de envío en este momento. Intenta nuevamente.");
  assert.equal(shippingQuoteActionLabel("error"), "Reintentar envío");
  assert.equal(shippingQuoteActionLabel("idle"), "Calcular envío");
  assert.equal(shippingQuoteActionLabel("empty"), "Calcular envío");
});
test("errores de red y quotes inválidas no simulan tarifas ni muestran Failed to fetch", () => {
  assert.equal(shippingQuoteErrorMessage(new TypeError("Failed to fetch"), "fallback"), "No pudimos conectar. Intenta nuevamente.");
  assert.match(shippingQuoteErrorMessage(new PublicCheckoutError("raw", "INVALID_QUOTE"), "fallback"), /ya no es válida/);
  assert.equal(shippingQuoteErrorMessage(new PublicCheckoutError("raw", "UNRECOGNIZED"), "Mensaje seguro"), "Mensaje seguro");
});
test("URL conserva filtros, dependencias y atribución; limpiar elimina todos los filtros", () => {
  const value = filters.parseShopFilters(
    "?category_id=4&vehicle_brand_id=3&vehicle_model_id=3&year=2024&min_price=10000&sort=price_desc&specs[wireless]=1"
  );
  assert.deepEqual(
    filters.parseShopFilters(filters.serializeShopFilters(value)),
    value
  );
  assert.equal(
    filters.shopUrl(
      filters.defaultShopFilters(),
      "?category_id=4&search=x&utm_source=qa"
    ),
    "/tienda?utm_source=qa"
  );
  assert.equal(
    filters.parseShopFilters("?vehicle_model_id=3&vehicle_version_id=4")
      .vehicle_model_id,
    ""
  );
  assert.equal(
    filters.parseShopFilters("?category_id=abc&year=2300&sort=unknown").sort,
    "featured"
  );
  assert.equal(
    filters.parseShopFilters("?specs[__proto__]=x").specs.__proto__,
    Object.prototype
  );
});
test("proxy de desarrollo sólo expone contratos públicos, nunca admin/auth", () => {
  for (const path of [
    "/api/products",
    "/api/products/producto-real",
    "/api/vehicle-models",
    "/sanctum/csrf-cookie",
    "/api/checkout/orders/public-token",
  ])
    assert.equal(allowedPublicProxyRequest("/__public-api" + path), true);
  assert.equal(
    allowedPublicProxyRequest("/__public-api/api/orders", "POST"),
    true
  );
  assert.equal(
    allowedPublicProxyRequest(
      "/__public-api/api/checkout/orders/token/shipping-address",
      "PUT"
    ),
    true
  );
  for (const path of [
    "/api/admin/products",
    "/api/my/commissions",
    "/api/auth/login",
    "/api/products/x/../../admin/users",
  ])
    assert.equal(allowedPublicProxyRequest("/__public-api" + path), false);
  for (const method of ["POST", "DELETE", "PATCH"])
    assert.equal(
      allowedPublicProxyRequest("/__public-api/api/products/x", method),
      false
    );
});
test("galería mantiene principal primera, elimina duplicados y agrega foto de variante", () => {
  const p = {
    ...product,
    images: [
      {
        image_url: "https://example.com/second.jpg",
        is_primary: false,
        sort_order: 0,
      },
      { image_url: product.image_url, is_primary: true, sort_order: 4 },
    ],
  };
  const original = JSON.stringify(p);
  assert.deepEqual(
    presentation.productGallery(p, {
      image_url: "https://example.com/variant.jpg",
    }),
    [
      product.image_url,
      "https://example.com/second.jpg",
      "https://example.com/variant.jpg",
    ]
  );
  assert.equal(JSON.stringify(p), original);
});
test("compatibilidad no inventa universal ni rangos, y usa los datos de la variante", () => {
  assert.deepEqual(presentation.productCompatibility(product), [
    "Compatibilidad universal",
  ]);
  assert.match(
    presentation.productCompatibility({
      ...product,
      is_universal: false,
      compatibility_type: "vehicle_specific",
    })[0],
    /Consulta la compatibilidad/
  );
  const variant = {
    effective_compatibility_type: "vehicle_specific",
    vehicle_compatibilities: [
      {
        vehicle_brand: { name: "Porsche" },
        vehicle_model: { name: "Macan" },
        year_from: 2019,
        year_to: 2024,
      },
    ],
  };
  assert.deepEqual(presentation.productCompatibility(product, variant), [
    "Porsche · Macan · 2019–2024",
  ]);
});
test("calendario público excluye domingo, límites exactos y preferencias pasadas", () => {
  assert.equal(booking.PUBLIC_BOOKING_TIMES.length, 19);
  assert.equal(booking.PUBLIC_BOOKING_TIMES[0], "09:00");
  assert.equal(booking.PUBLIC_BOOKING_TIMES.at(-1), "18:00");
  const now = new Date("2026-10-03T15:15:00-05:00");
  const today = booking.bogotaToday(now);
  assert.equal(
    booking.selectablePublicDate(new Date(2026, 9, 4), today),
    false
  );
  assert.equal(booking.selectablePublicDate(new Date(2026, 9, 5), today), true);
  assert.equal(booking.allowedPreferredTime(today, "15:00", now), false);
  assert.equal(booking.allowedPreferredTime(today, "15:30", now), true);
  for (const time of ["08:30", "18:30", "23:59", "09:15"])
    assert.equal(
      booking.allowedPreferredTime(new Date(2026, 9, 5), time, now),
      false
    );
  assert.equal(
    booking.bogotaToday(new Date("2026-10-04T02:00:00Z")).getDate(),
    3
  );
});
test("HTML del calendario sólo incluye seis días y mantiene confirmación manual", () => {
  const html = renderToString(createElement(Contact));
  assert.ok(html.includes("Lunes a sábado"));
  assert.ok(!/aria-label="domingo/.test(html));
  assert.ok(!html.includes("<span>D</span>"));
});
test("CRM vuelve a siete días sin clipping; preserva mejora accesible independiente", async () => {
  const source = await readFile(
    new URL("../src/modules/calendar/CalendarPage.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /length: 7/);
  assert.match(source, /WeekView days=\{days\}/);
  assert.ok(!source.includes("calendarTimeSlice"));
  assert.ok(!source.includes("CALENDAR_VISIBLE_DAYS"));
  assert.ok(source.includes("title={"));
  assert.ok(source.includes("AgendaView days={days}"));
});
test("SSR filtra con query validada, conserva selección, CSS del primer frame y frontera de hidratación", async () => {
  const original = globalThis.fetch;
  let requested = "";
  globalThis.fetch = async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ data: [product] }));
  };
  try {
    const result = await renderRequest(
      "/tienda?category_id=4&vehicle_brand_id=3&search=radio&sort=price_asc&secret=x",
      template,
      options
    );
    assert.equal(result.status, 200);
    assert.ok(requested.includes("category_id=4"));
    assert.ok(requested.includes("in_stock=1"));
    assert.ok(!requested.includes("secret="));
    assert.match(result.body.replace(/<!--.*?-->/g, ""), /3 filtros activos/);
    assert.ok(result.body.includes('value="radio"'));
    assert.ok(result.body.includes("<!--$-->"));
    assert.ok(result.body.includes('data-public-status="200"'));
    assert.equal(result.headers["X-Robots-Tag"], "noindex, follow");
    assert.ok(!result.body.includes("secret=x"));
    const clean = await renderRequest("/tienda", template, options);
    assert.match(clean.body.replace(/<!--.*?-->/g, ""), /0 filtros activos/);
    const plugin = await readFile(
      new URL("../scripts/public-seo-plugin.mjs", import.meta.url),
      "utf8"
    );
    assert.ok(plugin.includes("storefront-initial.css?direct"));
    const css = await readFile(
      new URL("../src/styles/storefront-initial.css", import.meta.url),
      "utf8"
    );
    assert.ok(css.includes("ShopPage.css"));
    assert.ok(css.includes("ProductDetailPage.css"));
  } finally {
    globalThis.fetch = original;
  }
});
