# fill-pdf

Herramienta web para escribir texto encima de un PDF de forma visual. Subís el PDF, hacés click donde querés escribir, escribís el texto, y generás el PDF final.

## Tecnologías

| Librería | Uso |
|---|---|
| [pdf-lib](https://pdf-lib.js.org/) | Escribe el texto en el PDF y genera el archivo final |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Renderiza el PDF en pantalla para la vista previa |

No requiere backend. Todo corre en el browser.

## Cómo usar

### 1. Instalar dependencias

```bash
yarn install
```

### 2. Levantar un servidor local

```bash
npx serve .
```

O con Python:

```bash
python3 -m http.server 3000
```

> No abrir el `index.html` directamente como archivo — el browser bloquea las CDNs sin servidor HTTP.

### 3. Abrir en el browser

```
http://localhost:3000
```

## Funcionalidades

- **Subir PDF** — cualquier PDF como base
- **Agregar texto** — click en cualquier parte del PDF para insertar un campo de texto
- **Mover texto** — arrastrá el ⠿ para reposicionar
- **Eliminar texto** — botón × que aparece al hacer hover sobre el campo
- **Tamaño y color** — se configuran en la barra antes de hacer click (aplican al próximo campo)
- **Navegación** — botones ◀ ▶ para PDFs de múltiples páginas (los textos se guardan por página)
- **Zoom** — botones − + para acercar/alejar la vista
- **Generar** — botón "⬇ Generar PDF" descarga el archivo `filled.pdf` con todos los textos incrustados

## Estructura

```
fill-pdf/
├── index.html   # UI: barra de herramientas + canvas + overlay de etiquetas
├── app.js       # Lógica: carga PDF, manejo de etiquetas, generación
├── package.json
└── solicitud.pdf  # PDF de ejemplo
```
