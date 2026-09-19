const DEFAULT_WIDTHS = [400, 800, 1200];

function unsplashSized(url: URL, width: number, format?: 'webp'): string {
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('w', String(width));
  if (!url.searchParams.has('q')) url.searchParams.set('q', '80');
  if (format) url.searchParams.set('fm', format);
  else url.searchParams.delete('fm');
  return url.toString();
}

export function buildResponsiveSources(
  src: string,
  widths: number[] = DEFAULT_WIDTHS,
): { src: string; srcSet?: string; webpSrcSet?: string } {
  if (!src.startsWith('http')) {
    return { src };
  }

  try {
    const url = new URL(src);
    if (!url.hostname.includes('unsplash.com') && !url.hostname.includes('images.unsplash.com')) {
      return { src };
    }

    const srcSet = widths.map((w) => `${unsplashSized(new URL(url), w)} ${w}w`).join(', ');
    const webpSrcSet = widths
      .map((w) => `${unsplashSized(new URL(url), w, 'webp')} ${w}w`)
      .join(', ');

    return {
      src: unsplashSized(new URL(url), widths[Math.min(1, widths.length - 1)] ?? 800),
      srcSet,
      webpSrcSet,
    };
  } catch {
    return { src };
  }
}
