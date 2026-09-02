'use client';

import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';

type ScreenAssetProps = {
  name: string;
  fallback?: ReactNode;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>;

export function ScreenAsset({ name, fallback = null, alt = '', className, ...rest }: ScreenAssetProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const path = `/screen-assets/${name}.png`;
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (!cancelled) setSrc(path);
    };
    image.onerror = () => {
      if (!cancelled) setSrc(null);
    };
    image.src = path;
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!src) return <>{fallback}</>;
  // oxlint-disable-next-line next/no-img-element -- local transparent HUD assets must preserve exact pixels and support runtime fallback.
  return <img alt={alt} className={className} src={src} {...rest} />;
}
