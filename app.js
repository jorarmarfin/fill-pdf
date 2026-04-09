pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── State ────────────────────────────────────────────────────────────────────
let pdfJsDoc       = null;
let totalPages     = 0;
let currentPage    = 1;
let scale          = 1.5;
let originalPdfBytes = null;
let labels         = [];   // { id, page, pdfX, pdfY, text, fontSize, color }
let labelIdCounter = 0;
let dragging       = false;
let insertMode     = false;

// ─── Elements ─────────────────────────────────────────────────────────────────
const canvas        = document.getElementById('pdf-canvas');
const ctx           = canvas.getContext('2d');
const labelsLayer   = document.getElementById('labels-layer');
const pageInfo      = document.getElementById('page-info');
const fileInput     = document.getElementById('file-input');
const fontSizeEl    = document.getElementById('font-size');
const colorEl       = document.getElementById('color');
const prevBtn       = document.getElementById('prev-page');
const nextBtn       = document.getElementById('next-page');
const generateBtn   = document.getElementById('generate-btn');
const zoomInBtn     = document.getElementById('zoom-in');
const zoomOutBtn    = document.getElementById('zoom-out');
const canvasWrapper = document.getElementById('canvas-wrapper');
const emptyState    = document.getElementById('empty-state');
const hint          = document.getElementById('hint');
const insertBtn     = document.getElementById('insert-btn');

// ─── Load PDF ─────────────────────────────────────────────────────────────────
async function loadPDF(arrayBuffer) {
  originalPdfBytes = arrayBuffer.slice(0); // copia para pdf-lib; PDF.js detacha el buffer original
  pdfJsDoc   = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  totalPages = pdfJsDoc.numPages;
  currentPage = 1;
  labels = [];

  emptyState.style.display    = 'none';
  canvasWrapper.style.display = 'block';
  hint.style.display          = 'block';

  generateBtn.disabled = false;
  zoomInBtn.disabled   = false;
  zoomOutBtn.disabled  = false;
  insertBtn.disabled   = false;

  insertMode = false;
  insertBtn.classList.remove('active');
  canvasWrapper.style.cursor = 'default';

  await renderPage(currentPage);
}

// ─── Render page ──────────────────────────────────────────────────────────────
async function renderPage(num) {
  const page     = await pdfJsDoc.getPage(num);
  const viewport = page.getViewport({ scale });

  canvas.width        = viewport.width;
  canvas.height       = viewport.height;
  canvas.style.width  = viewport.width  + 'px';
  canvas.style.height = viewport.height + 'px';

  labelsLayer.style.width  = viewport.width  + 'px';
  labelsLayer.style.height = viewport.height + 'px';

  await page.render({ canvasContext: ctx, viewport }).promise;

  pageInfo.textContent = `Página ${num} / ${totalPages}`;
  prevBtn.disabled = num <= 1;
  nextBtn.disabled = num >= totalPages;

  renderLabels();
}

// ─── Render labels overlay ────────────────────────────────────────────────────
function renderLabels() {
  labelsLayer.innerHTML = '';
  labels
    .filter(l => l.page === currentPage)
    .forEach(createLabelEl);
}

function createLabelEl(label) {
  const el = document.createElement('div');
  el.className  = 'label';
  el.dataset.id = label.id;

  positionEl(el, label);
  el.style.fontSize = (label.fontSize * scale) + 'px';
  el.style.color    = label.color;

  // Controls (drag + delete) — visible on hover
  const controls = document.createElement('div');
  controls.className = 'label-controls';

  const dragHandle = document.createElement('span');
  dragHandle.className   = 'drag-handle';
  dragHandle.textContent = '⠿';
  makeDraggable(el, dragHandle, label);
  controls.appendChild(dragHandle);

  // Text input
  const input = document.createElement('input');
  input.type        = 'text';
  input.value       = label.text;
  input.placeholder = 'Texto...';
  input.style.fontSize = 'inherit';
  input.style.color    = 'inherit';
  syncInputWidth(input, label);

  input.addEventListener('input', e => {
    label.text = e.target.value;
    syncInputWidth(e.target, label);
  });
  // Prevent canvas click from firing when editing
  input.addEventListener('mousedown', e => e.stopPropagation());
  input.addEventListener('click',     e => e.stopPropagation());

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '×';
  deleteBtn.className   = 'delete-btn';
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    labels = labels.filter(l => l.id !== label.id);
    renderLabels();
  });
  controls.appendChild(deleteBtn);

  el.appendChild(input);
  el.appendChild(controls);
  labelsLayer.appendChild(el);
}

function positionEl(el, label) {
  el.style.left = (label.pdfX * scale) + 'px';
  el.style.top  = (canvas.height - label.pdfY * scale) + 'px';
}

function syncInputWidth(input, label) {
  const charWidth = label.fontSize * scale * 0.58;
  input.style.width = Math.max(60, input.value.length * charWidth + 32) + 'px';
}

// ─── Drag labels ──────────────────────────────────────────────────────────────
function makeDraggable(el, handle, label) {
  let startMouseX, startMouseY, startLeft, startTop;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging    = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startLeft   = parseFloat(el.style.left);
    startTop    = parseFloat(el.style.top);

    const onMove = e => {
      const newLeft = startLeft + (e.clientX - startMouseX);
      const newTop  = startTop  + (e.clientY - startMouseY);
      el.style.left = newLeft + 'px';
      el.style.top  = newTop  + 'px';
      label.pdfX = newLeft / scale;
      label.pdfY = (canvas.height - newTop) / scale;
    };

    const onUp = () => {
      // Small delay so the canvas click handler sees dragging=true and ignores it
      setTimeout(() => { dragging = false; }, 20);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

// ─── Canvas click → add label ─────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (dragging || !pdfJsDoc || !insertMode) return;

  const rect  = canvas.getBoundingClientRect();
  const cx    = e.clientX - rect.left;
  const cy    = e.clientY - rect.top;

  const label = {
    id:       ++labelIdCounter,
    page:     currentPage,
    pdfX:     cx / scale,
    pdfY:     (canvas.height - cy) / scale,
    text:     '',
    fontSize: parseInt(fontSizeEl.value) || 12,
    color:    colorEl.value,
  };

  labels.push(label);
  renderLabels();

  // Auto-focus the new input
  requestAnimationFrame(() => {
    const newEl = labelsLayer.querySelector(`[data-id="${label.id}"] input`);
    if (newEl) newEl.focus();
  });
});

// ─── Generate PDF ─────────────────────────────────────────────────────────────
async function generatePDF() {
  if (!originalPdfBytes) return;

  generateBtn.disabled    = true;
  generateBtn.textContent = 'Generando…';

  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages  = pdfDoc.getPages();

    for (const label of labels) {
      if (!label.text.trim()) continue;
      const page = pages[label.page - 1];
      if (!page) continue;

      const [r, g, b] = hexToRgb(label.color);
      // El div se posiciona con su base (bottom) en pdfY, pero el baseline
      // visual de la fuente queda ~0.35 × fontSize por encima. Se corrige
      // para que el PDF coincida con lo que se ve en la pantalla.
      const yOffset = label.fontSize * 0.35;
      page.drawText(label.text, {
        x:     label.pdfX,
        y:     label.pdfY + yOffset,
        size:  label.fontSize,
        font,
        color: rgb(r, g, b),
      });
    }

    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, 'filled.pdf', 'application/pdf');
  } catch (err) {
    console.error(err);
    alert('Error al generar el PDF:\n' + err.message);
  } finally {
    generateBtn.disabled    = false;
    generateBtn.textContent = '⬇ Generar PDF';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function downloadFile(bytes, filename, mime) {
  const blob = new Blob([bytes], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Insert mode toggle ───────────────────────────────────────────────────────
insertBtn.addEventListener('click', () => {
  insertMode = !insertMode;
  insertBtn.classList.toggle('active', insertMode);
  canvasWrapper.style.cursor = insertMode ? 'crosshair' : 'default';
});

// ─── Toolbar events ───────────────────────────────────────────────────────────
fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await loadPDF(await file.arrayBuffer());
});

prevBtn.addEventListener('click', async () => {
  if (currentPage > 1) await renderPage(--currentPage);
});

nextBtn.addEventListener('click', async () => {
  if (currentPage < totalPages) await renderPage(++currentPage);
});

zoomInBtn.addEventListener('click', async () => {
  scale = Math.min(scale * 1.25, 4);
  if (pdfJsDoc) await renderPage(currentPage);
});

zoomOutBtn.addEventListener('click', async () => {
  scale = Math.max(scale / 1.25, 0.5);
  if (pdfJsDoc) await renderPage(currentPage);
});

generateBtn.addEventListener('click', generatePDF);
