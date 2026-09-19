import { buildResponsiveSources } from '@/lib/images';
import { cn } from '@/lib/cn';

type OptimizedImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  srcWidths?: number[];
};

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  priority = false,
  srcWidths,
}: OptimizedImageProps) {
  const sources = buildResponsiveSources(src, srcWidths);

  return (
    <picture>
      {sources.webpSrcSet ? (
        <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sizes} />
      ) : null}
      <img
        src={sources.src}
        srcSet={sources.srcSet}
        sizes={sources.srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'async' : 'async'}
        className={cn('bg-surface-muted object-cover', className)}
      />
    </picture>
  );
}
