'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ApartmentImage } from '@/data/apartments';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: ApartmentImage[];
  apartmentName: string;
}

export default function ImageGallery({ images, apartmentName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Check scroll position and update arrow visibility
  const checkScrollPosition = useCallback(() => {
    const container = thumbnailsRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  // Scroll thumbnails left/right
  const scrollThumbnails = (direction: 'left' | 'right') => {
    const container = thumbnailsRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Scroll selected thumbnail into view
  useEffect(() => {
    const container = thumbnailsRef.current;
    if (!container) return;

    const selectedThumb = container.children[selectedIndex] as HTMLElement;
    if (selectedThumb) {
      const containerRect = container.getBoundingClientRect();
      const thumbRect = selectedThumb.getBoundingClientRect();

      if (thumbRect.left < containerRect.left) {
        container.scrollBy({
          left: thumbRect.left - containerRect.left - 10,
          behavior: 'smooth',
        });
      } else if (thumbRect.right > containerRect.right) {
        container.scrollBy({
          left: thumbRect.right - containerRect.right + 10,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  // Initialize and monitor scroll position
  useEffect(() => {
    const container = thumbnailsRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, goToPrevious, goToNext]);

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Main Image with Navigation Arrows */}
        <div className="relative group/main">
          <div
            className="relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer"
            onClick={() => openLightbox(selectedIndex)}
          >
            <Image
              src={images[selectedIndex].src}
              alt={`${apartmentName} - ${images[selectedIndex].alt}`}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
              priority={selectedIndex === 0}
              loading={selectedIndex === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-black/0 group-hover/main:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover/main:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                Click to expand
              </span>
            </div>
          </div>

          {/* Navigation Arrows on Main Image */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all opacity-70 md:opacity-0 group-hover/main:opacity-100 hover:scale-110 z-10"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all opacity-70 md:opacity-0 group-hover/main:opacity-100 hover:scale-110 z-10"
            aria-label="Next image"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full z-10">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnails with Scroll Arrows */}
        <div className="relative group/thumbnails">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollThumbnails('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/95 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Scroll thumbnails left"
            >
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Thumbnails Container */}
          <div
            ref={thumbnailsRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1"
          >
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative w-20 h-16 md:w-24 md:h-20 flex-shrink-0 rounded-lg overflow-hidden transition-all',
                  index === selectedIndex
                    ? 'ring-2 ring-rose-600 ring-offset-2'
                    : 'opacity-70 hover:opacity-100'
                )}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="100px"
                  className="object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollThumbnails('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/95 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Scroll thumbnails right"
            >
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 p-3 text-white/80 hover:text-white transition-colors bg-black/30 hover:bg-black/50 rounded-full"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Main Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[80vh] mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex].src}
              alt={`${apartmentName} - ${images[selectedIndex].alt}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 p-3 text-white/80 hover:text-white transition-colors bg-black/30 hover:bg-black/50 rounded-full"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(index);
                }}
                className={cn(
                  'relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all',
                  index === selectedIndex
                    ? 'ring-2 ring-white'
                    : 'opacity-50 hover:opacity-100'
                )}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="64px"
                  className="object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
