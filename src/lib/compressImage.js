/**
 * Komprimerer et billede med Canvas API inden upload.
 * Skalerer ned til maxWidth/maxHeight og konverterer til JPEG med angivet kvalitet.
 *
 * @param {File} file - Det originale billedfil-objekt
 * @param {object} options
 * @param {number} options.maxWidth  - Maks bredde i pixels (default 1200)
 * @param {number} options.maxHeight - Maks højde i pixels (default 1200)
 * @param {number} options.quality  - JPEG-kvalitet 0–1 (default 0.82)
 * @returns {Promise<File>} Komprimeret fil som JPEG
 */
export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Skaler proportionelt ned hvis billedet er for stort
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob fejlede')); return }
          // Behold originalt filnavn, skift blot extension til .jpg
          const nytNavn = file.name.replace(/\.[^.]+$/, '') + '.jpg'
          resolve(new File([blob], nytNavn, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Kunne ikke indlæse billede'))
    }

    img.src = objectUrl
  })
}
