export async function optimizeImageFile(
  source: Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    filename?: string;
  } = {}
): Promise<File> {
  const {
    maxWidth = 900,
    maxHeight = 1350,
    quality = 0.8,
    filename = 'image.webp',
  } = options;

  const objectUrl = URL.createObjectURL(source);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
      img.src = objectUrl;
    });

    const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível para otimização da imagem.');

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Falha ao gerar imagem otimizada.')),
        'image/webp',
        quality
      );
    });

    return new File([blob], filename.replace(/\.[^.]+$/, '') + '.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
