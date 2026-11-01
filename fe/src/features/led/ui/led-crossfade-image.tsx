'use client';

import isValidImageSource from '@/lib/is-valid-image-source';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

const FADE_MS = 1000;

interface Layer<T> {
  id: number;
  item: T;
  src: string;
  visible: boolean;
}

interface LedCrossfadeImageProps<T> {
  item: T;
  src: string | null | undefined;
  alt: string;
  className?: string;
  // Rendered inside each layer so it fades together with its image.
  renderOverlay?: (item: T) => React.ReactNode;
}

/**
 * Cross-fades between images: the previous image stays on screen until the next one
 * has loaded, then the next one fades in on top of it (no dip to black).
 */
export default function LedCrossfadeImage<T>({
  item,
  src,
  alt,
  className,
  renderOverlay,
}: LedCrossfadeImageProps<T>) {
  const nextId = useRef(0);
  const [layers, setLayers] = useState<Layer<T>[]>([]);

  useEffect(() => {
    if (!isValidImageSource(src)) return;
    setLayers((current) => {
      const top = current[current.length - 1];
      if (top?.src === src) {
        // Same photo, only the details changed: update in place.
        return current.map((layer) =>
          layer.id === top.id ? { ...layer, item } : layer
        );
      }
      // Drop layers that never finished loading so a fast sequence does not pile up.
      const settled = current.filter((layer) => layer.visible);
      return [...settled, { id: nextId.current++, item, src: src as string, visible: false }];
    });
  }, [item, src]);

  const reveal = (id: number) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, visible: true } : layer))
    );
  };

  // Once a layer is fully faded in, the layers under it are no longer visible.
  const dropCovered = (id: number) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === id);
      return index > 0 ? current.slice(index) : current;
    });
  };

  return (
    <div className={`relative overflow-hidden bg-black ${className ?? ''}`}>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className='absolute inset-0 transition-opacity ease-in-out'
          style={{ opacity: layer.visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && layer.visible) dropCovered(layer.id);
          }}
        >
          <Image
            src={layer.src}
            alt={alt}
            fill
            sizes='100vw'
            className='object-cover'
            unoptimized
            priority
            onLoad={() => reveal(layer.id)}
            // Show the broken photo's details instead of keeping the previous graduate.
            onError={() => reveal(layer.id)}
          />
          {renderOverlay?.(layer.item)}
        </div>
      ))}
    </div>
  );
}
