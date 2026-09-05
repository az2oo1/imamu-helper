import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  type: 'avatar' | 'banner';
  uploadUrl?: string;
}

export default function ImageUploadInput({ label, value, onChange, type, uploadUrl = '/api/admin/upload' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', type === 'avatar' ? 'pfp' : 'resources');

    try {
      setIsUploading(true);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const uploadedUrl = data.urls?.[0] || data.url;
        if (uploadedUrl) {
          onChange(uploadedUrl);
        } else {
          alert('Upload failed: no URL returned');
        }
      } else {
        alert('File upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <div className="flex items-center gap-3">
        {/* Preview Thumbnail */}
        {value ? (
          <div className="relative group shrink-0">
            <img 
              referrerPolicy="no-referrer" 
              src={value} 
              alt={label} 
              className={type === 'avatar' ? "w-12 h-12 rounded-xl object-cover border" : "w-24 h-12 rounded-xl object-cover border"}
              style={{ borderColor: 'var(--border-color)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = value;
              }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            className={type === 'avatar' ? "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 bg-[var(--bg-subtle)]" : "w-24 h-12 rounded-xl border flex items-center justify-center shrink-0 bg-[var(--bg-subtle)]"}
            style={{ borderColor: 'var(--border-color)' }}
          >
            <ImageIcon className="w-5 h-5 text-slate-400" />
          </div>
        )}
        
        {/* Upload Button */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-xs font-semibold rounded-xl border transition w-full disabled:opacity-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
            <span>{isUploading ? 'Uploading to Object Storage...' : (value ? 'Change Image' : 'Upload to Storage')}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
}
