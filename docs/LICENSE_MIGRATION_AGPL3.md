# ⚖️ Gobernanza y Términos de Licencia: Migración a GNU AGPL-3.0

**Fecha de entrada en vigor:** 18 de noviembre de 2026  
**Versión de corte:** `v0.4.1`  
**Licencia actual:** [GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)](../LICENSE)  
**Licencia previa:** MIT (aplicable únicamente a versiones históricas previas a v0.4.1)  
**Titular del Copyright:** Lázaro Guerrero Losada (`lazaroguerrerolosada@uma.es`)

---

## 1. Motivación y Decisión Estratégica

Paplitz es un simulador pedagógico y motor analítico de perspectiva y dibujo técnico industrial. Inicialmente se distribuyó bajo la licencia permisiva MIT. 

Con el crecimiento del simulador, el motor cinemático de calistenia y el laboratorio 3D (`Lab 3D`), se decidió migrar a **GNU AGPL-3.0** para proteger el carácter abierto del proyecto y evitar que terceros o corporaciones privaticen el software, creen bifurcaciones cerradas de pago o desplieguen servicios web sin compartir las mejoras con la comunidad.

---

## 2. Implicaciones Clave de GNU AGPL-3.0

1. **Copyleft Fuerte (Código Abierto Obligatorio):**
   - Cualquier persona o entidad puede usar, estudiar, auditar y bifurcar Paplitz libremente.
   - Si alguien modifica el código o crea una obra derivada y la distribuye (ej. `.apk`, `.exe`, paquete Linux), **está legalmente obligado a publicar el código fuente completo bajo los mismos términos (AGPL-3.0)**.
2. **Cláusula de Red / Cloud (Affero):**
   - Al ser Paplitz una aplicación web moderna (SPA / PWA), la cláusula 13 de la AGPL-3.0 exige que si alguien aloja una versión modificada de Paplitz en un servidor o dominio accesible por red/internet, debe proporcionar a los usuarios un mecanismo visible (ej. enlace de descarga) para obtener el código fuente modificado completo.
3. **Compatibilidad de Dependencias:**
   - Las librerías de terceros empleadas en `package.json` (React, Tailwind CSS, Lucide, jsPDF, etc.) cuentan con licencias permisivas (MIT, Apache 2.0, BSD), las cuales son 100% compatibles con su distribución dentro de un proyecto bajo AGPL-3.0.
4. **No Retroactividad:**
   - Las copias históricas descargadas antes de la versión `0.4.1` mantienen los términos de la licencia MIT original para esos commits específicos. A partir de `0.4.1` en adelante, todo el desarrollo presente y futuro se rige exclusivamente por AGPL-3.0.

---

## 3. Ficheros de Referencia
- [`LICENSE`](../LICENSE): Texto legal oficial completo de GNU Affero General Public License v3.0 con la declaración de aplicación a Paplitz.
- [`package.json`](../package.json): Identificador SPDX `"license": "AGPL-3.0-or-later"`.
- [`README.md`](../README.md): Badge oficial de licencia y resumen de términos.
- [`src/components/ProfileView.tsx`](../src/components/ProfileView.tsx): Identificador de licencia visible en la interfaz para el usuario final.
