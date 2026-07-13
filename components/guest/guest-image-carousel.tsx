'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Image as ImageModel } from '@prisma/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IoGiftOutline } from 'react-icons/io5';

const AUTO_SLIDE_INTERVAL_MS = 5000;

type GuestImageCarouselProps = {
  images: ImageModel[];
};

export default function GuestImageCarousel({ images }: GuestImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleImages = images.filter(image => !!image.url);
  const showControls = visibleImages.length > 1;

  const goToPrevious = () =>
    setActiveIndex(
      previous => (previous - 1 + visibleImages.length) % visibleImages.length
    );
  const goToNext = () =>
    setActiveIndex(previous => (previous + 1) % visibleImages.length);

  // Restarting the interval on every `activeIndex` change means a manual
  // chevron/dot click also resets the 5s countdown, instead of the
  // auto-advance firing right on top of it.
  useEffect(() => {
    if (!showControls) return;

    const interval = setInterval(goToNext, AUTO_SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [showControls, activeIndex]);

  if (visibleImages.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full bg-gray-100 rounded-2xl shadow-inner">
        <IoGiftOutline className="text-6xl text-gray-300" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden relative w-full h-full rounded-2xl shadow-inner">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {visibleImages.map((image, index) => (
          <div key={image.id} className="relative w-full h-full shrink-0">
            <Image
              src={image.url as string}
              alt="Foto de la pareja"
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Bottom gradient so the dots stay legible over any photo */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {showControls && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={goToPrevious}
            className="flex absolute left-3 top-1/2 justify-center items-center w-9 h-9 text-white rounded-full transition-colors -translate-y-1/2 bg-black/30 hover:bg-black/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={goToNext}
            className="flex absolute right-3 top-1/2 justify-center items-center w-9 h-9 text-white rounded-full transition-colors -translate-y-1/2 bg-black/30 hover:bg-black/50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex absolute bottom-4 left-1/2 gap-2 -translate-x-1/2">
            {visibleImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
