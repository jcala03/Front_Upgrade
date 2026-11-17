# Oswald local — autorización y procedencia

El propietario autorizó explícitamente autoalojar la misma fuente el 16 de noviembre de 2026. Se conserva familia, pesos 400/500/600/700, estilo normal y `font-display: swap`. No se modificaron los binarios, la familia CSS ni las reglas tipográficas del proyecto.

Se obtuvieron los cuatro TTF originales de la misma respuesta de Google Fonts que usaba `index.html`: `https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap`, versión de distribución `v57`. Son archivos originales (aproximadamente 88 KiB cada uno), no una reconstrucción ni una fuente sustitutiva. La CSS local conserva sus declaraciones y cambia solo las URL por archivos del mismo origen.

Licencia SIL Open Font License 1.1, Copyright 2016 The Oswald Project Authors. Copia completa en `public/fonts/oswald/OFL.txt`, obtenida del [repositorio oficial](https://github.com/google/fonts/tree/main/ofl/oswald).

SHA-256:

| Peso | Archivo | SHA-256 |
|---|---|---|
| 400 | oswald-400.ttf | bd6ff5a83bcdc92d7aac6dbb16e4dd2b0b0320bec6402bb81f5dd9735b500e46 |
| 500 | oswald-500.ttf | edca7f2098242ead25675251ac9c35ecd2a9d001e4bcb641e07471148b6c365b |
| 600 | oswald-600.ttf | 20987dd8fd1d3e9ab087a55cb90e98081c873c729c113043e0bfb1ef0f9e0bd7 |
| 700 | oswald-700.ttf | a6ee8b91ec269a6f48631ba4ba1a3ab7e5039e5482dda8dc9672ee4620d7bd68 |

La fuente se despliega automáticamente con `public/`; no hay descarga externa en tiempo de ejecución. Se eliminaron únicamente los preconnect/stylesheet anteriores de Google Fonts. No se cambió ninguna directiva UTF-8, política de caché, Service Worker ni manifest.

El navegador de pruebas carga la fuente local y verifica ausencia de conexiones a Fonts/Analytics. Producción sigue sin cambios hasta autorización posterior de publicación.
