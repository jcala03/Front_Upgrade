# Catálogo geográfico del formulario de entrega

Snapshot local comprobado el 18 de noviembre de 2026. No contiene direcciones de clientes, credenciales, tarifas ni promesas de cobertura.

- Países: 249 códigos actuales ISO 3166-1; etiquetas españolas generadas con `Intl.DisplayNames`. Fuente: https://www.iso.org/iso-3166-country-codes.html. No se ofrecen los códigos históricos AN/ZR que todavía aparecen en algunos catálogos externos.
- Colombia: 33 divisiones departamentales, incluida Bogotá D.C.; 1122 municipios y áreas no municipalizadas del conjunto oficial DANE DIVIPOLA: https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w. Campos originales: `cod_dpto`, `dpto`, `cod_mpio`, `nom_mpio`. Consulta de lectura: `https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000&$select=cod_dpto,dpto,cod_mpio,nom_mpio&$order=cod_mpio`.
- Correspondencias de departamento para el resolvedor existente: nombres/códigos públicos comprobados en https://queries.envia.com/state?country_code=CO. Bogotá utiliza DC; San Andrés, SA. Referencia del proveedor: https://docs.envia.com/reference/states-by-country.

Las listas funcionan sin llamadas externas durante la escritura de una dirección. Al actualizar el snapshot se debe contrastar la fuente oficial, conservar identificadores como cadenas (ceros iniciales), comprobar unicidad/cobertura y ejecutar `tests/checkout-address.test.mjs`.

Los códigos DANE de cinco dígitos identifican opciones localmente: **no** se convierten en los identificadores de ocho dígitos de Envia ni en códigos postales. Se transmiten el nombre del departamento y el del municipio al resolvedor Laravel existente. Bogotá se transmite como ciudad `Bogotá`, dentro del departamento correspondiente. No se predice el código postal de una dirección a partir de su municipio.

Para países distintos de Colombia se conserva la entrada manual de estado/ciudad y dirección completa. No se incluye un catálogo mundial de ciudades ni se reduce la cobertura internacional previa. El proveedor y las reglas actuales determinan la disponibilidad de envío al cotizar; la presencia en una lista no confirma cobertura.
