const publicPath =
  /^\/(?:api\/(?:products(?:\/[^/]+)?|product-categories|product-brands|vehicle-brands|vehicle-models|vehicle-versions|vehicle-multimedia-systems|orders|checkout\/orders\/[^/]+(?:\/(?:payments\/wompi|shipping-address|shipping-quotes(?:\/apply)?|pickup-branches|pickup))?)|sanctum\/csrf-cookie)$/;

export function allowedPublicProxyRequest(url, method = "GET") {
  const path = new URL(url, "http://localhost").pathname.replace(
    /^\/__public-api/,
    ""
  );
  if (!publicPath.test(path)) return false;
  if (method === "GET" || method === "HEAD") return true;
  return (
    ["POST", "PUT"].includes(method) &&
    (path === "/api/orders" || path.startsWith("/api/checkout/orders/"))
  );
}

export function publicDevProxy(target) {
  return {
    "/__public-api": {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/__public-api/, ""),
      bypass(req, res) {
        if (!allowedPublicProxyRequest(req.url || "/", req.method)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end('{"message":"Ruta pública no disponible."}');
          return false;
        }
      },
    },
  };
}
