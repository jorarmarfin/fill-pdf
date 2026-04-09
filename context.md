# Contexto del proyecto — fill-pdf

## Propósito

Herramienta para llenar PDFs de la UTP (Universidad Tecnológica del Perú) con datos del estudiante.
Tiene dos modalidades: una **GUI web** interactiva y **scripts Node.js** con datos hardcodeados.

---

## Archivos clave

```
fill-pdf/
├── index.html              # GUI web — barra de herramientas + canvas + overlay
├── app.js                  # Lógica de la GUI (carga, inserción, generación de PDF)
├── fill-pdf.mjs            # Script Node.js para llenar solicitud.pdf
├── fill-compromiso-pdf.mjs # Script Node.js para llenar compromiso.pdf
├── solicitud.pdf           # Plantilla: Solicitud de aprobación del plan de tesis PT
├── compromiso.pdf          # Plantilla: Compromiso del estudiante
├── Solicitud-llenada.pdf   # Output del script fill-pdf.mjs
├── compromiso-llenada.pdf  # Output del script fill-compromiso-pdf.mjs
├── package.json            # type: module, depende solo de pdf-lib
└── yarn.lock
```

---

## Tecnologías

| Herramienta | Versión | Uso |
|---|---|---|
| pdf-lib | ^1.17.1 | Escribir texto en PDF y generar el archivo final |
| PDF.js | 3.11.174 (CDN) | Renderizar el PDF en canvas para la vista previa |
| Node.js | ESM (`type: module`) | Scripts de llenado hardcodeado |
| Yarn | 4.9.2 | Gestor de paquetes |

No requiere backend. La GUI corre íntegramente en el browser.

---

## Cómo ejecutar

### GUI web

```bash
yarn install
npx serve .
# Abrir http://localhost:3000
```

> **No abrir index.html directamente** — el browser bloquea las CDNs sin servidor HTTP.

### Scripts Node.js

```bash
node fill-pdf.mjs            # genera Solicitud-llenada.pdf
node fill-compromiso-pdf.mjs # genera compromiso-llenada.pdf
```

---

## Datos del estudiante (hardcodeados en los scripts)

```js
codigo:  'U23320147'
nombres: 'Luis Fernando Mayta Campos'
carrera: 'Ingeniería de Software'
campus:  'San Juan de Lurigancho'
correo:  'luis.mayta@gmail.com'
telefono: '992949424'
modalidad: 'individual'
titulo1: 'Implementación de un sistema web para mejorar los procesos de gestión académica, admisión'
titulo2: 'y matrícula en la Escuela de Posgrado de la Facultad de Ingeniería Industrial y de Sistemas de la UNI'
grado:   'Ingeniero de Software'
dia: '09', mes: 'Abril', anio: '6'
linea:   'Transformación digital y sistemas de información'
```

---

## Sistema de coordenadas (pdf-lib)

- **Origen (0,0)**: esquina inferior-izquierda de la página.
- **Y crece hacia arriba** (al contrario de HTML/pantalla).
- Página A4: 595.56 × 842.04 pt.
- Conversión desde herramientas que usan Y desde arriba (pdftotext -bbox, etc.):
  ```
  pdf_lib_Y = page_height - pdftotext_yMax
  ```

### Coordenadas calibradas — solicitud.pdf (Página 1)

Verificadas con `pdftotext -bbox` contra las etiquetas del formulario:

| Campo | x | y | size |
|---|---|---|---|
| Código UTP (1er integrante) | 140 | 592 | 11 |
| Nombres y Apellidos (1er) | 180 | 570 | 11 |
| Carrera (1er) | 130 | 548 | 11 |
| Campus (1er) | 130 | 528 | 11 |
| Teléfono y correo (1er) | 180 | 509 | 11 |
| X individual | 398 | 310 | 12 |
| Título línea 1 | 70 | 295 | 11 |
| Título línea 2 | 70 | 270 | 11 |
| Grado | 250 | 250 | 11 |

### Coordenadas calibradas — solicitud.pdf (Página 2)

| Campo | x | y | size |
|---|---|---|---|
| Horario (X) | 420 | 655 | 11 |
| Día | 70 | 460 | 11 |
| Mes | 150 | 460 | 11 |
| Año | 265 | 459 | 11 |

---

## GUI — Funcionamiento interno (app.js)

### Flujo principal

1. Usuario abre un PDF → se renderiza en `<canvas>` con PDF.js a `scale = 1.5`.
2. Activa el modo **✏ Insertar texto** (botón toggle).
3. Hace click en el canvas → se crea un `label` con coordenadas PDF.
4. Edita el texto en el input que aparece sobre el canvas.
5. Puede arrastrar (⠿) o eliminar (×) cada etiqueta.
6. Presiona **⬇ Generar PDF** → pdf-lib escribe todos los textos y descarga `filled.pdf`.

### Estructura de un label

```js
{
  id:       Number,
  page:     Number,   // página del PDF (base 1)
  pdfX:     Number,   // coordenada X en puntos PDF (borde izquierdo del texto)
  pdfY:     Number,   // coordenada Y en puntos PDF (click del usuario)
  text:     String,
  fontSize: Number,
  color:    String,   // hex color
}
```

### Conversión de coordenadas — click a PDF

```js
// Al hacer click en (cx, cy) del canvas:
pdfX = cx / scale
pdfY = (canvas.height - cy) / scale
```

### Posicionamiento del overlay (positionEl)

```js
el.style.left = (label.pdfX * scale) + 'px';
el.style.top  = (canvas.height - label.pdfY * scale) + 'px';
// CSS: transform: translate(0, -100%) → el fondo del div queda en el punto del click
```

El div tiene: `[input de texto][⠿ ×]` (controles a la DERECHA del texto).

---

## Bugs resueltos (historial de la sesión)

### Bug 1 — Texto vertical más abajo en el PDF que en la GUI

**Causa:** La GUI posiciona el div con `transform: translate(0, -100%)`, poniendo el **fondo del div** en el punto del click. El baseline visual de la fuente queda ~35% del fontSize por encima del punto del click. Sin embargo, `pdf-lib` dibuja el texto con el **baseline exactamente en `pdfY`** (el punto del click). Diferencia neta: ~`0.35 × fontSize` puntos más abajo en el PDF.

**Fix aplicado en `generatePDF()` (app.js):**
```js
const yOffset = label.fontSize * 0.35;
page.drawText(label.text, {
  x:    label.pdfX,
  y:    label.pdfY + yOffset,   // ← corrección
  size: label.fontSize,
  ...
});
```

### Bug 2 — Texto horizontal más a la izquierda en el PDF que en la GUI

**Causa:** El DOM del label tenía los controles (⠿ ×) **antes** del input en el flex container. Como `opacity: 0` no saca los elementos del flujo, los controles (~40px) empujaban el input hacia la derecha. El PDF dibujaba en `pdfX` (= borde izquierdo del div), sin ese desplazamiento → texto ~27pt a la izquierda de lo esperado.

**Fix aplicado en `createLabelEl()` (app.js):**
```js
// Antes:
el.appendChild(controls);
el.appendChild(input);

// Después:
el.appendChild(input);   // ← input primero → borde izquierdo = pdfX
el.appendChild(controls);
```

### Bug 3 — Botón toggle para modo inserción (feature nueva)

**Antes:** Cualquier click en el canvas siempre insertaba texto.  
**Implementado:**
- Botón **✏ Insertar texto** en la barra de herramientas.
- Por defecto **inactivo** al abrir un PDF.
- Al activar: botón se pone rojo, cursor cambia a `crosshair`.
- Al desactivar: vuelve al estado normal, cursor `default`.
- El canvas click handler verifica `insertMode` antes de crear un label.

---

## Estado actual del repositorio

```
Branch: master
Último commit: b357a4f "Gui" (añadió index.html, app.js, README.md)
Cambios sin commitear: fill-pdf.mjs (solo ajuste de fecha: dia '09', anio '6')
```

Los cambios de los bugs 1, 2 y 3 (en app.js e index.html) están sin commitear al momento de crear este documento.

---

## Posibles mejoras pendientes

- Guardar/cargar el estado de las etiquetas (JSON) para retomar el trabajo.
- Soporte para fuentes con tildes y caracteres especiales (actualmente Helvetica via pdf-lib cubre latin básico).
- Permitir seleccionar la fuente en la GUI (actualmente fijo a Helvetica en el PDF generado).
- El script `fill-compromiso-pdf.mjs` tiene coordenadas parcialmente calibradas — faltan campos de la página 2.
- Considerar empaquetar como app de escritorio (Electron/Tauri) para evitar depender de un servidor HTTP.
