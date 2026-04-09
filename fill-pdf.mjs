import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

console.log('Script iniciado...')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.join(__dirname, 'solicitud.pdf')
const outputPath = path.join(__dirname, 'Solicitud-llenada.pdf')

const data = {
  codigo: 'U23320147',
  nombres: 'Luis Fernando Mayta Campos',
  carrera: 'Ingeniería de Software',
  campus: 'San Juan de Lurigancho',
  contacto: '992949424                      luis.mayta@gmail.com',
  modalidad: 'individual', // individual | grupal
  titulo1: 'Implementación de un sistema web para mejorar los procesos de gestión académica, admisión',
  titulo2: 'y matrícula en la Escuela de Posgrado de la Facultad de Ingeniería Industrial y de Sistemas de la UNI',
  grado: 'Ingeniero de Software',
  horario: 'X',
  dia: '06',
  mes: 'Abril',
  anio: '6',
  linea: 'Transformación digital y sistemas de información',
}

const existingPdfBytes = fs.readFileSync(inputPath)
const pdfDoc = await PDFDocument.load(existingPdfBytes)
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const pages = pdfDoc.getPages()

console.log(`Número de páginas en el PDF: ${pages.length}`)
console.log('Escribiendo datos en el PDF...')

function write(page, text, x, y, size = 11) {
  page.drawText(String(text ?? ''), {
    x,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  })
}

// Página 1
const page1 = pages[0]
write(page1, data.codigo, 140, 592)
write(page1, data.nombres, 180, 570)
write(page1, data.carrera, 130, 548)
write(page1, data.campus, 130, 528)
write(page1, data.contacto, 180, 509)

if (data.modalidad === 'individual') {
  write(page1, 'X', 398, 310, 12)
} else if (data.modalidad === 'grupal') {
  write(page1, 'X', 320, 560, 12)
}

write(page1, data.titulo1, 70, 295)
write(page1, data.titulo2, 70, 270)
write(page1, data.grado, 250, 250)

// Página 2
const page2 = pages[1]
write(page2, data.horario, 420, 655)
write(page2, data.dia, 70, 460)
write(page2, data.mes, 150, 460)
write(page2, data.anio, 265, 459)

// Página 3
const page3 = pages[2]
// write(page3, data.linea, 70, 220)

console.log('Intentando guardar el PDF...')
try {
  const pdfBytes = await pdfDoc.save()
  console.log(`PDF generado, tamaño: ${pdfBytes.length} bytes`)
  fs.writeFileSync(outputPath, pdfBytes)
  console.log(`PDF generado: ${outputPath}`)
} catch (error) {
  console.error('Error al guardar el PDF:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
