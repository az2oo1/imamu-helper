'use client';

import React, { useEffect, useImperativeHandle, forwardRef, useState, useRef } from 'react';
import { 
  Bold, Italic, Quote, Link as LinkIcon, AtSign, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Eye, Edit3
} from 'lucide-react';
import { FormattedNewsContent } from './FormattedNewsContent';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface TipTapEditorRef {
  insertMention: (username: string) => void;
  insertText: (text: string) => void;
  setContent: (content: string) => void;
}

const TipTapEditor = forwardRef<TipTapEditorRef, Props>(({ value, onChange, placeholder, className }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) {
      onChange((value || '') + textToInsert);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || '';
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    onChange(newVal);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  const wrapSelection = (prefix: string, suffix: string = prefix, defaultText: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || '';
    const selectedText = currentVal.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  useImperativeHandle(ref, () => ({
    insertMention: (username: string) => {
      insertTextAtCursor(` @${username} `);
    },
    insertText: (text: string) => {
      insertTextAtCursor(text);
    },
    setContent: (content: string) => {
      onChange(content);
    }
  }));

  const handleInsertLink = () => {
    if (!linkUrl) return;
    let url = linkUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = 'https://' + url;
    }
    wrapSelection('[', `](${url})`, 'رابط');
    setLinkUrl('');
    setShowLinkPrompt(false);
  };

  return (
    <div className={`relative flex-1 flex flex-col ${className || ''}`} dir="rtl">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap gap-1 bg-stone-900/90 dark:bg-zinc-900 p-2 rounded-2xl border border-stone-800 dark:border-zinc-800 mb-3 shadow-sm">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**', 'نص عريض')}
          className="p-2 rounded-xl text-stone-300 dark:text-zinc-300 hover:bg-stone-800 dark:hover:bg-zinc-800 hover:text-white transition"
          title="عريض"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('*', '*', 'نص مائل')}
          className="p-2 rounded-xl text-stone-300 dark:text-zinc-300 hover:bg-stone-800 dark:hover:bg-zinc-800 hover:text-white transition"
          title="مائل"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('\n> ', '\n', 'اقتباس')}
          className="p-2 rounded-xl text-stone-300 dark:text-zinc-300 hover:bg-stone-800 dark:hover:bg-zinc-800 hover:text-white transition"
          title="اقتباس"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-stone-800 dark:bg-zinc-800 my-auto mx-1" />

        <button
          type="button"
          onClick={() => insertTextAtCursor('\n### ')}
          className="px-2.5 py-1 text-xs font-bold rounded-xl text-stone-300 dark:text-zinc-300 hover:bg-stone-800 dark:hover:bg-zinc-800 hover:text-white transition"
          title="عنوان رئيسي"
        >
          H3
        </button>

        <button
          type="button"
          onClick={() => insertTextAtCursor(' @')}
          className="p-2 rounded-xl text-stone-300 dark:text-zinc-300 hover:bg-stone-800 dark:hover:bg-zinc-800 hover:text-white transition"
          title="إشارة لمستخدم"
        >
          <AtSign className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLinkPrompt(!showLinkPrompt)}
            className={`p-2 rounded-xl transition ${showLinkPrompt ? 'bg-stone-800 text-white' : 'text-stone-300 dark:text-zinc-300 hover:bg-stone-800 hover:text-white'}`}
            title="إضافة رابط"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {showLinkPrompt && (
            <div className="absolute top-full right-0 mt-2 p-3 bg-stone-900 border border-stone-700 dark:border-zinc-700 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 min-w-[260px]">
              <input
                autoFocus
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-white text-xs outline-none focus:border-[var(--color-imamu-accent)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkPrompt(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkPrompt(false)}
                  className="flex-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-white text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="flex-1 px-3 py-1.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] rounded-xl text-white text-xs font-bold transition"
                >
                  حفظ
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-stone-800 dark:bg-zinc-800 my-auto mx-1" />

        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={`mr-auto px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            isPreview 
              ? 'bg-[var(--color-imamu-accent)] text-white' 
              : 'bg-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          {isPreview ? (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>تحرير</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة المحتوى</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="bg-stone-950/80 border border-stone-800 dark:border-zinc-800 rounded-3xl overflow-hidden focus-within:border-[var(--color-imamu-accent)] transition-all min-h-[380px] flex flex-col p-4">
        {isPreview ? (
          <div className="flex-1 overflow-y-auto p-3 text-white">
            <FormattedNewsContent content={value || 'لا يوجد محتوى للمعاينة'} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "اكتب مقالك أو خبرك هنا... (يدعم تنسيق الماركداون والروابط)"}
            dir="auto"
            className="w-full flex-1 min-h-[360px] bg-transparent text-white text-sm sm:text-base outline-none resize-none leading-relaxed placeholder-stone-500 font-sans"
          />
        )}
      </div>
    </div>
  );
});

export default TipTapEditor;
