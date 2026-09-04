// Phone cameras produce 12 MP photos. Claude sees no more detail above about
// 1568px on the long edge, so anything larger is tokens — and money — spent for
// nothing. Resizing here is the single largest cost lever in the app: a raw
// 4000px photo costs several times more per scan than this does.
const MAX_EDGE = 1568
const QUALITY = 0.82

export async function prepareFile(file) {
  if (file.type === 'application/pdf') {
    return { data: await toBase64(file), mimeType: 'application/pdf', previewUrl: null }
  }

  // imageOrientation honours the EXIF rotation flag that phones set when you
  // shoot in portrait. Without it, half of all uploads arrive sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  // Documents are mostly white; filling first avoids black edges if the source
  // has transparency (screenshots of PDFs often do).
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/jpeg', QUALITY)
  )

  return {
    data: await toBase64(blob),
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
  }
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(blob)
  })
}
