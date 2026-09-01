'use client';

import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';

interface NewsMediaPreviewProps {
  imageUrl?: string | null;
  title?: string;
  onImageClick?: (e: React.MouseEvent) => void;
  className?: string;
  onStatusChange?: (status: 'valid' | 'invalid') => void;
}

/**
 * Renders news media preview with automatic small image/emoji detection.
 * If the loaded image is smaller than 180x180 (e.g. emoji, sticker, tiny icon),
 * it hides the image preview container completely.
 */
export function NewsMediaPreview({
  imageUrl,
  title,
  onImageClick,
  className = "w-full max-h-80 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 mb-4 relative group cursor-pointer shadow-2xs",
  onStatusChange
}: NewsMediaPreviewProps) {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  if (!imageUrl || status === 'invalid') return null;

  return (
    <div
      onClick={onImageClick}
      className={`${className} ${status === 'loading' ? 'opacity-0 h-0 overflow-hidden mb-0 border-0 p-0' : 'opacity-100'}`}
    >
      <img
        src={imageUrl}
        alt={title || ''}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          if ((naturalWidth > 0 && naturalWidth < 180) || (naturalHeight > 0 && naturalHeight < 180)) {
            setStatus('invalid');
            if (onStatusChange) onStatusChange('invalid');
          } else {
            setStatus('valid');
            if (onStatusChange) onStatusChange('valid');
          }
        }}
        onError={() => {
          setStatus('invalid');
          if (onStatusChange) onStatusChange('invalid');
        }}
        className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
      />
      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <span className="px-3.5 py-1.5 rounded-full bg-black/65 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-lg">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>عرض الصورة بحجم كامل</span>
        </span>
      </div>
    </div>
  );
}
