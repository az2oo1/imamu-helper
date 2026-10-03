'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Smile } from 'lucide-react';
import { matchArabicSearch } from '../lib/search-utils';

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
  category: 'academic' | 'tech' | 'goals' | 'lifestyle' | 'feelings' | 'symbols';
}

export const EMOJI_DATABASE: EmojiItem[] = [
  // 🎓 Academic & Education
  { emoji: '🎓', name: 'تخرج', category: 'academic', keywords: ['تخرج', 'جامعة', 'طالب', 'دراسة', 'شهادة', 'كلية', 'قبعة', 'graduation', 'university', 'college', 'degree', 'student'] },
  { emoji: '📚', name: 'كتب', category: 'academic', keywords: ['كتب', 'مكتبة', 'دراسة', 'قراءة', 'مراجع', 'books', 'study', 'library', 'read'] },
  { emoji: '📖', name: 'كتاب مفتوح', category: 'academic', keywords: ['كتاب', 'مفتوح', 'قراءة', 'صفحة', 'book', 'reading', 'open'] },
  { emoji: '📝', name: 'مذكرة وملاحظات', category: 'academic', keywords: ['مذكرة', 'ملاحظات', 'كتابة', 'واجب', 'امتحان', 'اختبار', 'memo', 'notes', 'writing', 'test', 'exam'] },
  { emoji: '✏️', name: 'قلم رصاص', category: 'academic', keywords: ['قلم', 'رصاص', 'كتابة', 'رسم', 'تخطيط', 'pencil', 'write', 'draw'] },
  { emoji: '✒️', name: 'قلم حبر', category: 'academic', keywords: ['قلم', 'حبر', 'توقيع', 'خط', 'pen', 'fountain', 'ink'] },
  { emoji: '🖊️', name: 'قلم جاف', category: 'academic', keywords: ['قلم', 'جاف', 'كتابة', 'ballpoint', 'pen'] },
  { emoji: '📐', name: 'مثلث هندسي', category: 'academic', keywords: ['مسطرة', 'مثلث', 'هندسة', 'رياضيات', 'حساب', 'قياس', 'ruler', 'triangle', 'math', 'geometry'] },
  { emoji: '📏', name: 'مسطرة', category: 'academic', keywords: ['مسطرة', 'قياس', 'متر', 'طول', 'ruler', 'straight'] },
  { emoji: '📌', name: 'دبوس تثبيت', category: 'academic', keywords: ['دبوس', 'تثبيت', 'مهمة', 'لوحة', 'pin', 'pushpin', 'board'] },
  { emoji: '📎', name: 'مشبك ورق', category: 'academic', keywords: ['مشبك', 'ورق', 'مرفق', 'ملف', 'paperclip', 'attachment'] },
  { emoji: '🗂️', name: 'فهرس ملفات', category: 'academic', keywords: ['ملفات', 'فهرس', 'مجلدات', 'أرشيف', 'folders', 'card index'] },
  { emoji: '📁', name: 'مجلد', category: 'academic', keywords: ['مجلد', 'ملف', 'أرشيف', 'folder', 'directory'] },
  { emoji: '📂', name: 'مجلد مفتوح', category: 'academic', keywords: ['مجلد', 'مفتوح', 'ملف', 'open folder'] },
  { emoji: '📋', name: 'لوحة مهام', category: 'academic', keywords: ['لوحة', 'مهام', 'قائمة', 'جدول', 'clipboard', 'checklist', 'tasks'] },
  { emoji: '🏛️', name: 'صرح وجامعة', category: 'academic', keywords: ['جامعة', 'مبنى', 'صرح', 'كلية', 'عمادة', 'university', 'building', 'faculty'] },
  { emoji: '🏫', name: 'مدرسة وكلية', category: 'academic', keywords: ['مدرسة', 'كلية', 'مبنى', 'تعليم', 'school', 'academy'] },
  { emoji: '🎒', name: 'حقيبة مدرسية', category: 'academic', keywords: ['حقيبة', 'شنطة', 'مدرسة', 'طالب', 'backpack', 'school bag'] },
  { emoji: '📜', name: 'وثيقة وشهادة', category: 'academic', keywords: ['شهادة', 'وثيقة', 'مخطوطة', 'تخرج', 'diploma', 'certificate', 'scroll'] },
  { emoji: '🏷️', name: 'وسم وتصنيف', category: 'academic', keywords: ['وسم', 'تصنيف', 'بطاقة', 'تاج', 'tag', 'label'] },

  // 💻 Tech & Science
  { emoji: '💻', name: 'حاسوب ولابتوب', category: 'tech', keywords: ['كمبيوتر', 'لابتوب', 'حاسب', 'برمجة', 'كود', 'تقنية', 'laptop', 'computer', 'code', 'dev', 'programming'] },
  { emoji: '🖥️', name: 'كمبيوتر مكتبي', category: 'tech', keywords: ['شاشة', 'حاسوب', 'مكتبي', 'desktop', 'monitor', 'screen'] },
  { emoji: '⌨️', name: 'لوحة مفاتيح', category: 'tech', keywords: ['كيبورد', 'لوحة مفاتيح', 'طباعة', 'كود', 'keyboard', 'typing'] },
  { emoji: '🖱️', name: 'فأرة كمبيوتر', category: 'tech', keywords: ['ماوس', 'فأرة', 'نقر', 'mouse', 'click'] },
  { emoji: '📱', name: 'هاتف ذكي', category: 'tech', keywords: ['جوال', 'هاتف', 'موبايل', 'تطبيق', 'phone', 'mobile', 'cell', 'app'] },
  { emoji: '🔬', name: 'مجهر وميكروسكوب', category: 'tech', keywords: ['مجهر', 'ميكروسكوب', 'مختبر', 'أحياء', 'علوم', 'microscope', 'lab', 'science', 'biology'] },
  { emoji: '🧪', name: 'أنبوب اختبار', category: 'tech', keywords: ['أنبوب', 'اختبار', 'كيمياء', 'تجارب', 'معمل', 'test tube', 'chemistry', 'experiment'] },
  { emoji: '🧫', name: 'طبق بتري', category: 'tech', keywords: ['طبق بتري', 'بكتيريا', 'أحياء', 'معمل', 'petri dish', 'biology'] },
  { emoji: '🧬', name: 'حمض نووي DNA', category: 'tech', keywords: ['حمض نووي', 'جينات', 'وراثة', 'dna', 'genetics', 'biology'] },
  { emoji: '🔭', name: 'تلسكوب فلكي', category: 'tech', keywords: ['تلسكوب', 'فلك', 'مرصد', 'نجوم', 'telescope', 'astronomy', 'stars'] },
  { emoji: '📡', name: 'قمر صناعي', category: 'tech', keywords: ['قمر صناعي', 'هوائي', 'شبكات', 'اتصالات', 'satellite', 'dish', 'network'] },
  { emoji: '⚡', name: 'طاقة وبرق', category: 'tech', keywords: ['كهرباء', 'طاقة', 'برق', 'سرعة', 'قوة', 'lightning', 'energy', 'power', 'fast', 'electricity'] },
  { emoji: '💡', name: 'مصباح وفكرة', category: 'tech', keywords: ['مصباح', 'فكرة', 'إلهام', 'ذكاء', 'إضاءة', 'نور', 'lightbulb', 'idea', 'creative'] },
  { emoji: '🔋', name: 'بطارية', category: 'tech', keywords: ['بطارية', 'شحن', 'طاقة', 'battery', 'charge'] },
  { emoji: '⚙️', name: 'ترس وإعدادات', category: 'tech', keywords: ['ترس', 'إعدادات', 'هندسة', 'ميكانيكا', 'gear', 'settings', 'engineering'] },
  { emoji: '🧮', name: 'معداد ورياضيات', category: 'tech', keywords: ['عداد', 'رياضيات', 'حساب', 'أرقام', 'abacus', 'math', 'calculate'] },
  { emoji: '🤖', name: 'روبوت وذكاء اصطناعي', category: 'tech', keywords: ['روبوت', 'ذكاء اصطناعي', 'آلي', 'ai', 'robot', 'bot'] },
  { emoji: '🌐', name: 'إنترنت وشبكة', category: 'tech', keywords: ['إنترنت', 'شبكة', 'ويب', 'عالم', 'web', 'internet', 'globe', 'network'] },
  { emoji: '🔐', name: 'قفل وأمان', category: 'tech', keywords: ['أمان', 'قفل', 'تشفير', 'حماية', 'lock', 'security', 'secure'] },

  // 🎯 Goals & Success
  { emoji: '🎯', name: 'هدف وتركيز', category: 'goals', keywords: ['هدف', 'تركيز', 'دقة', 'طموح', 'نيشان', 'target', 'goal', 'focus', 'accuracy'] },
  { emoji: '🚀', name: 'صاروخ وانطلاق', category: 'goals', keywords: ['صاروخ', 'انطلاق', 'بداية', 'تقدم', 'سرعة', 'rocket', 'launch', 'startup', 'advance'] },
  { emoji: '🏆', name: 'كأس وبطولة', category: 'goals', keywords: ['كأس', 'بطولة', 'فوز', 'جائزة', 'إنجاز', 'تفوق', 'trophy', 'win', 'champion', 'cup'] },
  { emoji: '🥇', name: 'مركز أول', category: 'goals', keywords: ['ميدالية', 'مركز أول', 'ذهبية', 'أول', 'gold medal', 'first place', 'champion'] },
  { emoji: '🥈', name: 'مركز ثاني', category: 'goals', keywords: ['ميدالية', 'مركز ثاني', 'فضية', 'ثاني', 'silver medal', 'second'] },
  { emoji: '🥉', name: 'مركز ثالث', category: 'goals', keywords: ['ميدالية', 'مركز ثالث', 'برونزية', 'ثالث', 'bronze medal', 'third'] },
  { emoji: '🎖️', name: 'وسام تكريم', category: 'goals', keywords: ['وسام', 'تكريم', 'شرف', 'medal', 'military'] },
  { emoji: '🌟', name: 'نجمة مضيئة', category: 'goals', keywords: ['نجمة', 'تألق', 'تميز', 'إبداع', 'نجم', 'star', 'glowing', 'shine', 'excellence'] },
  { emoji: '⭐', name: 'نجمة', category: 'goals', keywords: ['نجمة', 'مفضل', 'مهم', 'star', 'favorite'] },
  { emoji: '✨', name: 'بريق وتألق', category: 'goals', keywords: ['بريق', 'تألق', 'سحر', 'لمعان', 'sparkles', 'glitter', 'magic'] },
  { emoji: '📊', name: 'رسم بياني', category: 'goals', keywords: ['رسم بياني', 'إحصائيات', 'مخطط', 'بيانات', 'chart', 'stats', 'data', 'analytics'] },
  { emoji: '📈', name: 'مؤشر صاعد', category: 'goals', keywords: ['نمو', 'صعود', 'ارتفاع', 'تقدم', 'chart up', 'growth', 'trending'] },
  { emoji: '📉', name: 'مؤشر هابط', category: 'goals', keywords: ['انخفاض', 'هبوط', 'نزول', 'chart down'] },
  { emoji: '💼', name: 'حقيبة أعمال', category: 'goals', keywords: ['حقيبة', 'أعمال', 'وظيفة', 'شغل', 'إدارة', 'مهنة', 'briefcase', 'business', 'job', 'work'] },
  { emoji: '🧭', name: 'بوصلة وتوجيه', category: 'goals', keywords: ['بوصلة', 'اتجاه', 'مسار', 'خطة', 'توجيه', 'compass', 'direction', 'guidance'] },
  { emoji: '⏳', name: 'ساعة رملية', category: 'goals', keywords: ['ساعة رملية', 'وقت', 'انتظار', 'مهلة', 'ديدلاين', 'hourglass', 'time', 'deadline'] },
  { emoji: '⏰', name: 'منبه وساعة', category: 'goals', keywords: ['ساعة', 'منبه', 'موعد', 'وقت', 'alarm', 'clock', 'time'] },
  { emoji: '📅', name: 'تقويم وجدول', category: 'goals', keywords: ['تقويم', 'جدول', 'تاريخ', 'مواعيد', 'calendar', 'date', 'schedule'] },
  { emoji: '💰', name: 'مال ونقود', category: 'goals', keywords: ['مال', 'فلوس', 'مكافأة', 'استثمار', 'ثروة', 'money', 'bag', 'wealth'] },
  { emoji: '💎', name: 'جوهرة وألماسة', category: 'goals', keywords: ['ألماسة', 'جوهرة', 'ثمين', 'قيمة', 'diamond', 'gem', 'luxury'] },
  { emoji: '👑', name: 'تاج وتفوق', category: 'goals', keywords: ['تاج', 'ملك', 'قمة', 'تفوق', 'أول', 'crown', 'king', 'leader'] },
  { emoji: '🏁', name: 'خط النهاية', category: 'goals', keywords: ['راية', 'خط النهاية', 'نهاية الترم', 'ختام', 'فوز', 'flag', 'finish', 'race'] },
  { emoji: '🔑', name: 'مفتاح النجاح', category: 'goals', keywords: ['مفتاح', 'حل', 'سر', 'دخول', 'key', 'solution', 'password'] },
  { emoji: '🛡️', name: 'درع حماية', category: 'goals', keywords: ['درع', 'حماية', 'أمان', 'دفاع', 'shield', 'defense', 'protection'] },
  { emoji: '💯', name: 'درجة كاملة', category: 'goals', keywords: ['مية', 'كامل', 'ممتاز', 'درجة كاملة', 'فل مارك', 'hundred', 'perfect', '100', 'score'] },

  // ☕ Mind & Lifestyle
  { emoji: '🧠', name: 'عقل وتفكير', category: 'lifestyle', keywords: ['عقل', 'دماغ', 'تفكير', 'ذكاء', 'حفظ', 'فهم', 'brain', 'mind', 'intellect', 'smart'] },
  { emoji: '🎨', name: 'لوحة ألوان وفن', category: 'lifestyle', keywords: ['فن', 'ألوان', 'رسم', 'تصميم', 'إبداع', 'art', 'palette', 'paint', 'design'] },
  { emoji: '🎭', name: 'مسرح وفنون', category: 'lifestyle', keywords: ['مسرح', 'تمثيل', 'فنون', 'أدب', 'theater', 'drama', 'performing'] },
  { emoji: '🎬', name: 'سينما وإخراج', category: 'lifestyle', keywords: ['سينما', 'فيديو', 'إخراج', 'فيلم', 'movie', 'film', 'cinema'] },
  { emoji: '📷', name: 'كاميرا وتصوير', category: 'lifestyle', keywords: ['كاميرا', 'تصوير', 'صورة', 'فوتو', 'camera', 'photo'] },
  { emoji: '🎧', name: 'سماعات وتركيز', category: 'lifestyle', keywords: ['سماعات', 'استماع', 'صوت', 'تركيز', 'بودكاست', 'headphones', 'audio', 'listen'] },
  { emoji: '🎵', name: 'نغمة موسيقية', category: 'lifestyle', keywords: ['موسيقى', 'نغمة', 'صوت', 'ألحان', 'music', 'note', 'tune'] },
  { emoji: '☕', name: 'قهوة وتركيز', category: 'lifestyle', keywords: ['قهوة', 'كوب', 'تركيز', 'نشاط', 'صباح', 'كافيين', 'coffee', 'espresso', 'morning', 'cafe'] },
  { emoji: '🍵', name: 'شاي أخضر', category: 'lifestyle', keywords: ['شاي', 'أخضر', 'نعناع', 'استرخاء', 'مشروب', 'tea', 'green tea'] },
  { emoji: '🌿', name: 'عشب وطبيعة', category: 'lifestyle', keywords: ['نبات', 'عشب', 'طبيعة', 'هدوء', 'خضار', 'herb', 'plant', 'nature'] },
  { emoji: '🪴', name: 'نبتة ونمو', category: 'lifestyle', keywords: ['نبتة', 'شجرة', 'نمو', 'تطور', 'plant', 'pot', 'grow'] },
  { emoji: '🌸', name: 'زهرة ووردة', category: 'lifestyle', keywords: ['وردة', 'زهرة', 'ربيع', 'جمال', 'flower', 'blossom', 'spring'] },
  { emoji: '🌲', name: 'شجرة صنوبر', category: 'lifestyle', keywords: ['شجرة', 'غابة', 'طبيعة', 'tree', 'forest', 'evergreen'] },
  { emoji: '🪐', name: 'كوكب وفضاء', category: 'lifestyle', keywords: ['كوكب', 'زحل', 'فضاء', 'كون', 'planet', 'saturn', 'space'] },
  { emoji: '🌙', name: 'هلال وقمر', category: 'lifestyle', keywords: ['هلال', 'قمر', 'ليل', 'سهر', 'دراسة ليلية', 'moon', 'crescent', 'night'] },
  { emoji: '☀️', name: 'شمس مشرقة', category: 'lifestyle', keywords: ['شمس', 'صباح', 'نور', 'طاقة', 'تفاؤل', 'sun', 'sunny', 'day'] },
  { emoji: '🔥', name: 'شعلة ونار', category: 'lifestyle', keywords: ['نار', 'شغف', 'حماس', 'ترند', 'قوة', 'fire', 'flame', 'passion', 'lit'] },
  { emoji: '🌊', name: 'أمواج وبحر', category: 'lifestyle', keywords: ['بحر', 'موج', 'ماء', 'هدوء', 'ocean', 'wave', 'sea', 'water'] },

  // 😊 Feelings & Smileys
  { emoji: '🤓', name: 'طالب مجتهد', category: 'feelings', keywords: ['دحاح', 'شاطر', 'نظارات', 'دراسة', 'ذكاء', 'nerd', 'geek', 'smart', 'glasses'] },
  { emoji: '😎', name: 'روقان وثقة', category: 'feelings', keywords: ['نظارة', 'روقان', 'كول', 'ثقة', 'فخم', 'cool', 'sunglasses', 'confident'] },
  { emoji: '😊', name: 'ابتسامة سعادة', category: 'feelings', keywords: ['ابتسامة', 'سعادة', 'فرح', 'رضا', 'smile', 'happy', 'blush'] },
  { emoji: '🤔', name: 'تفكير وسؤال', category: 'feelings', keywords: ['تفكير', 'حيرة', 'سؤال', 'غموض', 'thinking', 'ponder', 'wonder'] },
  { emoji: '🧐', name: 'تدقيق وبحث', category: 'feelings', keywords: ['تدقيق', 'فحص', 'بحث', 'نظارة مكبرة', 'monocle', 'inspect', 'curious'] },
  { emoji: '🥳', name: 'احتفال وفرح', category: 'feelings', keywords: ['احتفال', 'حفلة', 'نجاح', 'فرحة', 'تخرج', 'party', 'celebrate', 'congrats'] },
  { emoji: '🤩', name: 'انبهار وتميز', category: 'feelings', keywords: ['انبهار', 'إعجاب', 'نجوم', 'عيون', 'star-struck', 'amazed', 'wow'] },
  { emoji: '💪', name: 'قوة وإصرار', category: 'feelings', keywords: ['قوة', 'عزيمة', 'إصرار', 'تمارين', 'عضلات', 'muscle', 'strong', 'flex', 'power'] },
  { emoji: '🤝', name: 'مصافحة وتعاون', category: 'feelings', keywords: ['مصافحة', 'تعاون', 'اتفاق', 'شراكة', 'فريق', 'handshake', 'deal', 'agreement', 'partner'] },
  { emoji: '👏', name: 'تصفيق وتشجيع', category: 'feelings', keywords: ['تصفيق', 'تشجيع', 'برافو', 'أحسنت', 'clapping', 'applause', 'bravo'] },
  { emoji: '🙌', name: 'شكر وابتهاج', category: 'feelings', keywords: ['احتفال', 'دعاء', 'شكر', 'أيدي', 'raising hands', 'cheer', 'praise'] },
  { emoji: '❤️', name: 'قلب أحمر', category: 'feelings', keywords: ['قلب', 'حب', 'شغف', 'اهتمام', 'heart', 'love', 'red heart'] },
  { emoji: '💚', name: 'قلب أخضر', category: 'feelings', keywords: ['قلب أخضر', 'جامعة', 'وطن', 'خير', 'green heart'] },
  { emoji: '🤍', name: 'قلب أبيض', category: 'feelings', keywords: ['قلب أبيض', 'نقاء', 'سلام', 'صفاء', 'white heart'] },

  // ⭐ Symbols & Activities
  { emoji: '⚽', name: 'كرة قدم', category: 'symbols', keywords: ['كرة', 'قدم', 'رياضة', 'لعب', 'مباراة', 'soccer', 'football', 'ball'] },
  { emoji: '🏀', name: 'كرة سلة', category: 'symbols', keywords: ['كرة سلة', 'رياضة', 'basketball'] },
  { emoji: '🎾', name: 'كرة مضرب', category: 'symbols', keywords: ['تنس', 'مضرب', 'رياضة', 'tennis'] },
  { emoji: '🎮', name: 'ألعاب فيديو', category: 'symbols', keywords: ['ألعاب', 'بلايستيشن', 'قيمينق', 'ترفيه', 'controller', 'game', 'gaming'] },
  { emoji: '✈️', name: 'طائرة وسفر', category: 'symbols', keywords: ['طائرة', 'سفر', 'رحلة', 'إجازة', 'airplane', 'travel', 'flight', 'vacation'] },
  { emoji: '🏖️', name: 'شاطئ وصيف', category: 'symbols', keywords: ['شاطئ', 'إجازة', 'صيف', 'بحر', 'beach', 'summer', 'vacation'] },
  { emoji: '🏕️', name: 'تخييم وكشتة', category: 'symbols', keywords: ['تخييم', 'كشتة', 'بر', 'خيمة', 'camping', 'tent'] },
  { emoji: '🪄', name: 'عصا سحرية', category: 'symbols', keywords: ['عصا', 'سحر', 'إبداع', 'magic', 'wand'] },
  { emoji: '💫', name: 'دوامة نجوم', category: 'symbols', keywords: ['نجوم', 'دوران', 'تألق', 'dizzy', 'sparkle', 'stars'] },
  { emoji: '🌈', name: 'قوس قزح', category: 'symbols', keywords: ['قوس قزح', 'ألوان', 'تفاؤل', 'rainbow'] },
  { emoji: '🟢', name: 'دائرة خضراء', category: 'symbols', keywords: ['أخضر', 'دائرة', 'نشط', 'متاح', 'green circle'] },
  { emoji: '🔵', name: 'دائرة زرقاء', category: 'symbols', keywords: ['أزرق', 'دائرة', 'blue circle'] },
  { emoji: '🟣', name: 'دائرة بنفسجية', category: 'symbols', keywords: ['بنفسجي', 'دائرة', 'purple circle'] },
  { emoji: '🟠', name: 'دائرة برتقالية', category: 'symbols', keywords: ['برتقالي', 'دائرة', 'orange circle'] },
  { emoji: '🟡', name: 'دائرة صفراء', category: 'symbols', keywords: ['أصفر', 'دائرة', 'yellow circle'] },
  { emoji: '🔴', name: 'دائرة حمراء', category: 'symbols', keywords: ['أحمر', 'دائرة', 'تنبيه', 'red circle'] },
];

export interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmoji?: string;
  onSelectEmoji: (emoji: string) => void;
  title?: string;
}

export function EmojiPickerPopover({
  isOpen,
  onClose,
  selectedEmoji,
  onSelectEmoji,
  title = 'أيقونة الفصل الدراسي'
}: EmojiPickerPopoverProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Check if search contains a pasted/typed emoji directly
  const customPastedEmoji = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return null;
    const emojiRegex = /\p{Extended_Pictographic}/u;
    if (emojiRegex.test(trimmed)) {
      const match = trimmed.match(/\p{Extended_Pictographic}+/u);
      return match ? match[0] : null;
    }
    return null;
  }, [search]);

  // Filter emojis based on query
  const filteredEmojis = useMemo(() => {
    const q = search.trim();
    if (!q) return EMOJI_DATABASE;

    return EMOJI_DATABASE.filter(item => {
      if (item.emoji.includes(q)) return true;
      const textToSearch = [item.name, ...item.keywords];
      return matchArabicSearch(textToSearch, q);
    });
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          {/* Popover Card with instant non-laggy entrance */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.08 }}
            className="absolute top-full mt-2 right-0 z-50 w-76 sm:w-80 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{title}</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن إيموجي (دراسة، كتاب، برمجة)..."
                  className="w-full pl-8 pr-8.5 py-1.5 bg-slate-100 dark:bg-zinc-800/80 border border-transparent focus:border-[var(--color-imamu-accent)]/50 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition focus:bg-white dark:focus:bg-zinc-800"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Custom Pasted Emoji Banner (if user typed/pasted any direct emoji) */}
              {customPastedEmoji && (
                <div className="mt-2 p-1.5 rounded-xl bg-[var(--color-imamu-brown)]/10 dark:bg-[var(--color-imamu-brown)]/20 border border-[var(--color-imamu-brown)]/20 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-imamu-accent)] flex items-center gap-1.5">
                    <span>رمز مخصص:</span>
                    <span className="text-base">{customPastedEmoji}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectEmoji(customPastedEmoji);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-imamu-brown)] text-white text-[10px] font-bold shadow-xs hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
                  >
                    استخدام هذا الرمز
                  </button>
                </div>
              )}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 max-h-60 overflow-y-auto custom-scrollbar flex-1">
              {filteredEmojis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">لم يتم العثور على إيموجي مطابق</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    جرب كلمة بحث أخرى، أو الصق أي إيموجي تريده مباشرة في حقل البحث!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {filteredEmojis.map(item => {
                    const isSelected = selectedEmoji === item.emoji;
                    return (
                      <button
                        key={`${item.emoji}-${item.category}-${item.name}`}
                        type="button"
                        onClick={() => {
                          onSelectEmoji(item.emoji);
                          onClose();
                        }}
                        title={item.name}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition transform active:scale-90 hover:scale-110 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-imamu-brown)]/15 ring-2 ring-inset ring-[var(--color-imamu-accent)] shadow-xs scale-105'
                            : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span>{item.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
