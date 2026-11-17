# Branding original — fase 2 local

Se reutilizaron exclusivamente los cambios pendientes de branding del repositorio original, aplicados sobre la fase 1 sin reemplazar componentes antiguos completos.

- Arte original `src/assets/logos/upgrade79-logo.png`, 150×150, transparencia conservada. El archivo HQ alternativo es 1536×1024 y no se usa para estos consumidores.
- Footer y login pasan del rótulo tipográfico al original, con caja intrínseca cuadrada y `object-fit: contain`. El header público mantiene el mismo original y elimina sombras artificiales. CRM conserva su imagen del sidebar/cabecera lateral, con dimensiones explícitas; la topbar textual no recibe otro logo duplicado.
- Cuatro PNG de instalación generados mediante el script existente: 180, 192, 512 y maskable 512. Sin reconstrucción, recorte ni IA; máscara dentro del círculo seguro. La ampliación no añade detalle al original.
- Manifest, start_url, registro PWA, SHA-256 del Service Worker, Splash y sus tiempos: sin modificaciones.
- Pruebas focales: 4/4 PASS en Node 22, incluida decodificación de PNG y círculo seguro; sintaxis PHP: PASS.
- Chrome local, componentes reales y sesión sintética sin permisos/datos personales: tres vistas × siete anchos (1440,1280,1024,768,430,390,360), sin overflow ni errores de ejecución. No representa un inicio de sesión real en producción.
- Build cliente + TypeScript + SSR + prerender: PASS. Se conserva el aviso previo de chunks grandes.
- Capturas comparativas: `/tmp/upgrade79-branding-captures/before/` y `/tmp/upgrade79-branding-captures/after/`, archivos `public-1440.png`, `public-390.png`, `login-1440.png`, `login-390.png`, `crm-1440.png`, `crm-390.png`. Public incluye header y footer; CRM móvil incluye drawer abierto.
- Safari/iOS físico e icono de una PWA ya instalada: pendientes de comprobación manual. No se promete actualización inmediata del icono cacheado por el sistema operativo.

No se hicieron push ni deploy. Los archivos dist generados se excluyen del commit; su whitespace heredado no se modifica en esta tarea. `git diff --cached --check` verifica únicamente los cambios del release.
