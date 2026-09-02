'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export function ImageViewerModal({ imageUrl, onClose, title }: ImageViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = title || 'image';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 backdrop-blur-md p-3 sm:p-6 overflow-hidden select-none"
        onClick={() => onClose()}
        dir="rtl"
      >
        {/* Top Control Bar */}
        <div 
          className="absolute top-4 inset-x-4 z-10 flex items-center justify-between pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition shadow-md"
              title="إغلاق النافذة (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

            {title && (
              <span className="text-xs sm:text-sm font-bold text-white/90 line-clamp-1 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition shadow-md"
              title={isZoomed ? "تصغير" : "تكبير"}
            >
              {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>

            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition shadow-md"
              title="فتح الصورة في نافذة جديدة"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            <button
              onClick={handleDownload}
              className="p-2.5 rounded-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-md transition"
              title="تحميل الصورة"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: isZoomed ? 1.35 : 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
          className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center cursor-pointer"
        >
          <img
            src={imageUrl}
            alt={title || "Image Viewer"}
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl transition-transform duration-300"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
