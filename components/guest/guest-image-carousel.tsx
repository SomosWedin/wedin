'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Image as ImageModel } from '@prisma/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IoGiftOutline } from 'react-icons/io5';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

const AUTO_SLIDE_INTERVAL_MS = 3000;

type GuestImageCarouselProps = {
  images: Pick<ImageModel, 'id' | 'url'>[];
};

export default function GuestImageCarousel({ images }: GuestImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleImages = images.filter(image => !!image.url);
  const showControls = visibleImages.length > 1;

  useEffect(() => {
    if (!api) return;

    setSelectedIndex(api.selectedScrollSnap());
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());

    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  if (visibleImages.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full bg-gray-100 shadow-inner rounded-none sm:rounded-2xl">
        <IoGiftOutline className="text-6xl text-gray-300" />
      </div>
    );
  }

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      plugins={
        showControls
          ? [Autoplay({ delay: AUTO_SLIDE_INTERVAL_MS, stopOnInteraction: false })]
          : []
      }
      className="overflow-hidden relative w-full h-full shadow-inner rounded-none sm:rounded-2xl"
    >
      <CarouselContent className="ml-0 h-full">
        {visibleImages.map((image, index) => (
          <CarouselItem key={image.id} className="pl-0">
            {/* Mirrors guest-hero.tsx's `aspect-[3/4]` wrapper: next/image's
                `fill` needs a concretely-sized ancestor, and the carousel's
                own viewport div (from components/ui/carousel.tsx) is
                content-sized, not stretched to its parent's height. */}
            <div className="relative w-full aspect-[1/1]">
              <Image
                src={image.url as string}
                alt="Foto de la pareja"
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {showControls && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => api?.scrollPrev()}
            className="flex absolute left-3 top-1/2 justify-center items-center w-9 h-9 text-white rounded-full transition-colors -translate-y-1/2 bg-black/30 hover:bg-black/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() => api?.scrollNext()}
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
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all ${index === selectedIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
