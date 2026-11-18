# Plan: migrar fill-pdf a app de escritorio (Tauri)

## Estado actual (versión web, abril 2026)
- Editor visual de PDF: carga PDF, lo renderiza con PDF.js (CDN), click para poner texto, arrastrar, y genera PDF con pdf-lib.
- Todo en el browser, sin backend. Archivos: `index.html`, `app.js` (~300 líneas, JS vanilla).
- Scripts Node con coordenadas fijas: eliminados (todo se hace desde el sistema).
- Dependencia: `pdf-lib` (yarn 4).
- Ojo: scripts y PDFs llenados contienen datos personales (código, correo, teléfono).

## Decisión: Tauri v2
| Opción | Esfuerzo | Notas |
|---|---|---|
| Tauri v2 (elegida) | Bajo | Reusa index.html + app.js. Binario ~5-10 MB. Rust/cargo ya instalado. |
| Electron | Bajo | Pesa 100+ MB. |
| Rust puro (lopdf/printpdf + egui) | Alto | Reescribir todo, innecesario. |
| PWA | Mínimo | Instalable desde Chrome, sin empaquetar. |

## Cambios necesarios con Tauri
1. Bundlear PDF.js y pdf-lib local (npm + vite), sin CDN.
2. Diálogos nativos: abrir PDF (`plugin-dialog`), guardar (`plugin-fs`) en vez de `<input file>` + descarga Blob.
3. Scripts de plantillas (solicitud) -> pantalla de formulario.
4. Linux: instalar `webkit2gtk-4.1` y deps de Tauri.

## Mejora propuesta: modo "plantilla"
- Colocar campos una vez con el editor visual, nombrarlos, guardar JSON (coordenadas + nombre de campo).
- Luego solo llenar formulario y exportar. Elimina coordenadas hardcodeadas en `.mjs`.

## Estrategia de repo (decidida): misma repo
- Tag `v1-web` + rama `legacy-web` congelan la versión actual.
- `master` evoluciona a Tauri.

```bash
cd /home/lmayta/WebstormProjects/fill-pdf
git status
git branch --show-current
git tag v1-web
git branch legacy-web
# si hay remoto:
git push origin legacy-web v1-web
```

## Pendientes
- [x] Ejecutar tag + rama (antes de tocar master).
- [x] Scaffold Tauri v2 en master (`src-tauri/`, vite).
- [x] Migrar `app.js` / `index.html` (`src/app.js`, deps locales).
- [x] Diálogos nativos abrir/guardar.
- [x] Scripts: `run.sh`, `scripts/deploy-linux.sh`, `scripts/deploy-windows.ps1` (MSIX).
- [x] CI `.github/workflows/release.yml` (solo en release published).
- [ ] Modo plantilla (JSON).
- [x] Eliminar PDFs/scripts/context con datos personales (todo por el sistema).
