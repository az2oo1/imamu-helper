const PREFIX_GROUPS: Record<string, string> = {
  'ريض': 'الرياضيات|رياضيات|math|mat',
  'عال': 'علوم الحاسب|علوم حاسب|حاسب|الحاسب|cs',
  'تال': 'تقنية المعلومات|تقنية معلومات|المعلومات|معلومات|it',
  'نال': 'نظم المعلومات|نظم معلومات|is',
  'هاب': 'هندسة البرمجيات|هندسة برمجيات|البرمجيات|برمجيات|se|swe',
  'همع': 'هندسة معمارية|الهندسة المعمارية',
  'هدم': 'هندسة مدنية|الهندسة المدنية',
  'كهر': 'هندسة كهربائية|الهندسة الكهربائية',
  'همك': 'هندسة ميكانيكية|الهندسة الميكانيكية',
  'هكم': 'هندسة كيميائية|الهندسة الكيميائية',
  'هند': 'هندسة صناعية|هندسة عامة|الهندسة العامة',
  'فيز': 'الفيزياء|فيزياء|phys|phy',
  'احص': 'الإحصاء|إحصاء|احصاء|stat|sta',
  'كيم': 'الكيمياء|كيمياء|chem|chm',
  'حيا': 'الأحياء|أحياء|احياء|bio|biol',
  'حسب': 'المحاسبة|محاسبة|acct|acc|تطبيقات الحسبة|حسبة',
  'قصد': 'الاقتصاد|اقتصاد|الاقتصاد و العلوم الادارية|الاقتصاد والعلوم الإدارية|econ',
  'مال': 'التمويل|المالية|التمويل والإستثمار|التمويل والاستثمار|تمويل|fin',
  'دار': 'إدارة الأعمال|ادارة الاعمال|العلوم الإدارية|العلوم الادارية',
  'ادا': 'الإدارة|إدارة|الادارة|ادارة|إدا|mgmt|mgt',
  'سوق': 'التسويق|تسويق',
  'صمم': 'الجرافكس والوسائط المتعددة|الجرافكس|الوسائط المتعددة',
  'صرف': 'الأعمال المصرفية|الاعمال المصرفية|أعمال مصرفية',
  'عدل': 'الأنظمة لكلية الشريعة|الانظمة لكلية الشريعة',
  'ذكا': 'الذكاء الاصطناعي|ذكاء اصطناعي',
  'سما': 'السينما والمسرح',
  'سلم': 'الثقافة الإسلامية|الثقافة الاسلامية|الدراسات الإسلامية|الدراسات الاسلامية|ثقافة إسلامية|ثقافة اسلامية|ic|islm',
  'قرا': 'القرآن|القرآن الكريم|القرآن وعلومه|قرآن|qur',
  'سنه': 'السنة|السنة وعلومها|السنه',
  'عقد': 'العقيدة|العقيدة والمذاهب المعاصرة|عقيدة',
  'فقه': 'الفقه',
  'اصل': 'أصول الفقه|اصول الفقه|أصل',
  'عرب': 'اللغة العربية|اللغه العربية|عربي|arab',
  'ادب': 'الأدب',
  'نحو': 'النحو|النحو و الصرف وفقه اللغة',
  'بلغ': 'البلاغة|البلاغة والنقد|البلاغة والنقد والأدب الإسلامي|البلاغة والنقد والأدب السلامي',
  'ادت': 'الإدارة والتخطيط التربوي|الادارة والتخطيط التربوي|إدارة وتخطيط تربوي|ادارة وتخطيط تربوي',
  'اصت': 'أصول التربية|اصول التربية',
  'ترب': 'التربية|تربية',
  'نجل': 'اللغة الإنجليزية|اللغه الإنجليزية|اللغه الإنجليزية وآدابها|انجليزي|إنجليزي|eng|نجم',
  'ترخ': 'التاريخ|التاريخ و الحضارة|تاريخ|hist',
  'جغر': 'الجغرافيا|جغرافيا|geog',
  'صحف': 'الصحافة|صحافة',
  'ذاع': 'الإذاعة|الإذاعة والتلفاز',
  'علق': 'العلاقات العامة',
  'نفس': 'علم النفس',
  'جمع': 'الاجتماع|علم الاجتماع|الاجتماع و الخدمه الاجتماعية',
  'خدم': 'خدمة أجتماعية|خدمة اجتماعية',
};

export const CANONICAL_PREFIX_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PREFIX_GROUPS).flatMap(([canonical, aliases]) =>
    [canonical, ...aliases.split('|').filter(Boolean)].map(alias => [alias, canonical])
  )
) as Record<string, string>;

const PREREQ_STOP_WORDS = new Set([
  'الدرجة', 'الحد', 'الأدنى', 'الادنى', 'الجامعية', 'المستوى',
  'الفصل', 'ساعة', 'ساعات', 'درجة', 'عام', 'سنة', 'مقرر',
  'مقررات', 'درجه', 'الدرجه', 'المتطلبات', 'المتطلب', 'السابقة', 'السابق'
]);

const COURSE_CODE_PATTERN = /(?:([A-Za-z]{2,5})|((?:[\u0600-\u06FF]{1,20}\s+){0,4}[\u0600-\u06FF]{2,20}))\s*(\d{3,5})/g;
const PREREQ_LABEL_PATTERN = /^\s*(?:المتطلبات السابقة|المتطلب السابق|prerequisites?|prereq)\s*:?\s*/i;
const METADATA_PATTERN = /\s+(?:الجامعية|الدبلوم|دبلوم(?:\s+عام)?|الماجستير|الدكتوراه|الدراسات\s+العليا|المرحلة|الدرجة|الدرجه)(?:\s*[-–]\s*[^\d|()]+)?(?:\s+\d{1,3}\b)?/g;

function normalizePrefix(prefix: string): string {
  const cleaned = prefix
    .trim()
    .toLowerCase()
    .replace(/^(?:أو|او|و)\s+/, '')
    .replace(METADATA_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (CANONICAL_PREFIX_MAP[cleaned]) return CANONICAL_PREFIX_MAP[cleaned];

  const words = cleaned.split(' ');
  for (let start = 1; start < words.length; start++) {
    const suffix = words.slice(start).join(' ');
    if (CANONICAL_PREFIX_MAP[suffix]) return CANONICAL_PREFIX_MAP[suffix];
  }

  return cleaned;
}

function findCourseCodes(text: string): Array<{ prefix: string; number: string }> {
  return Array.from(text.matchAll(COURSE_CODE_PATTERN), match => ({
    prefix: match[1] || match[2] || '',
    number: match[3]
  }));
}

export function normalizeCourseCode(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const m = trimmed.match(/^(.+?)\s*(\d{3,5})$/);
  if (!m) return trimmed;
  const canon = normalizePrefix(m[1]);
  const num = m[2];
  return `${canon} ${num}`;
}

export function areCourseCodesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizeCourseCode(a).replace(/\s+/g, '').toLowerCase();
  const normB = normalizeCourseCode(b).replace(/\s+/g, '').toLowerCase();
  return normA === normB;
}

export function extractPrereqCodes(rawText?: string | null): string[] {
  if (!rawText) return [];
  const text = String(rawText).replace(PREREQ_LABEL_PATTERN, '');
  return Array.from(new Set(
    findCourseCodes(text)
      .map(({ prefix, number }) => normalizeCourseCode(`${prefix} ${number}`))
      .filter(code => !PREREQ_STOP_WORDS.has(code.split(' ')[0]))
  ));
}

export function cleanPrereqText(rawText?: string | null): string {
  if (!rawText) return '';
  let cleaned = String(rawText)
    .replace(PREREQ_LABEL_PATTERN, '')
    .replace(/&ndash;/g, '-')
    .replace(/(?:^|\s+)(?:الجامعية|الدبلوم|دبلوم\s*عام|دبلوم|الماجستير|الدكتوراه|الدراسات\s*العليا|المرحلة|الدرجة|الدرجه)(?:\s*[-–]\s*[^\d|()]+)?(?:\s+\b\d{1,3}\b)?(?=\s|$|[|)\]])/g, '')
    .replace(/\s+\b(5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9]|100)\b(?=\s*($|[|)\]]))/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*\|\s*/g, ' | ')
    .trim();
  cleaned = cleaned.replace(COURSE_CODE_PATTERN, (match, en, ar, num) => {
    const rawPrefix = (en || ar || '').trim();
    const connector = /^(?:أو|او|و)\s+/.test(rawPrefix) ? `${rawPrefix.match(/^(?:أو|او|و)/)?.[0]} ` : '';
    const normalized = normalizeCourseCode(`${rawPrefix} ${num}`);
    return connector + normalized;
  });

  return cleaned.replace(/\s+/g, ' ').trim();
}

export function getSubjectPrereqs(s: any): string[] {
  const codes: string[] = [];
  if (s.prereq) {
    codes.push(...extractPrereqCodes(s.prereq));
  }
  if (s.description) {
    codes.push(...extractPrereqCodes(s.description));
  }
  return Array.from(new Set(codes));
}

export function isCourseCompleted(completedCourses: string[], targetCode: string): boolean {
  if (!targetCode || !completedCourses || !Array.isArray(completedCourses)) return false;
  return completedCourses.some(c => areCourseCodesEqual(c, targetCode));
}

function splitAtParenDepth0(text: string, separatorRegex: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let lastIndex = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const sub = text.slice(i);
      const match = sub.match(separatorRegex);
      if (match && sub.startsWith(match[0])) {
        parts.push(text.slice(lastIndex, i).trim());
        i += match[0].length - 1;
        lastIndex = i + 1;
      }
    }
  }
  parts.push(text.slice(lastIndex).trim());
  return parts.filter(Boolean);
}

export function parsePrereqClauses(rawText?: string | null): string[][] {
  if (!rawText) return [];
  const text = String(rawText).trim();
  if (!text) return [];
  if (text.includes('|')) {
    const andClauses = splitAtParenDepth0(text, /^\|\s*و\s*/);
    if (andClauses.length > 1) {
      const clauses: string[][] = [];
      for (const rc of andClauses) {
        const codes = extractPrereqCodes(rc);
        if (codes.length > 0) clauses.push(codes);
      }
      return clauses;
    }
    const orBranches = splitAtParenDepth0(text, /^\|\s*أو\s*/);
    if (orBranches.length > 1) {
      const hasInternalAnd = orBranches.some(b => /\|\s*و\s*/.test(b));
      if (hasInternalAnd) {
        const bundles: string[][] = [];
        for (const branch of orBranches) {
          const codes = extractPrereqCodes(branch);
          if (codes.length > 0) bundles.push(codes);
        }
        return bundles;
      }
      const allCodes = extractPrereqCodes(text);
      return allCodes.length > 0 ? [allCodes] : [];
    }
    const codes = extractPrereqCodes(text);
    return codes.length > 0 ? [codes] : [];
  }
  const rawParts = text.split(/[,،؛]|\s+و\s+/);
  const clauses: string[][] = [];
  for (const rc of rawParts) {
    const codes = extractPrereqCodes(rc);
    if (codes.length > 0) clauses.push(codes);
  }
  return clauses;
}

export interface PrereqEvaluationResult {
  isLocked: boolean;
  unmetPrereqs: string[];
  unmetDescriptions: string[];
  clauses: string[][];
}

export function evaluateCoursePrerequisites(params: {
  prereqText?: string | null;
  completedCourses: string[];
  majorCourseCodes?: string[];
}): PrereqEvaluationResult {
  const { prereqText, completedCourses, majorCourseCodes } = params;
  if (!prereqText || !prereqText.trim()) {
    return { isLocked: false, unmetPrereqs: [], unmetDescriptions: [], clauses: [] };
  }

  const text = prereqText.trim();
  if (text.includes('|')) {
    const orBranches = splitAtParenDepth0(text, /^\|\s*أو\s*/);
    const hasInternalAnd = orBranches.length > 1 && orBranches.some(b => /\|\s*و\s*/.test(b));

    if (hasInternalAnd) {
      let anyBranchSatisfied = false;
      const validBranches: { branch: string; unmet: string[]; allBranchCodes: string[] }[] = [];

      for (const branch of orBranches) {
        const requiredCodes = extractPrereqCodes(branch);
        const isBranchSatisfied = requiredCodes.every(code => isCourseCompleted(completedCourses, code));
        if (isBranchSatisfied) {
          anyBranchSatisfied = true;
          break;
        }

        if (majorCourseCodes && majorCourseCodes.length > 0) {
          const inMajor = requiredCodes.filter(c => majorCourseCodes.some(m => areCourseCodesEqual(m, c)));
          if (inMajor.length > 0) {
            const unmetInMajor = inMajor.filter(c => !isCourseCompleted(completedCourses, c));
            validBranches.push({ branch, unmet: unmetInMajor, allBranchCodes: inMajor });
          }
        } else {
          const unmet = requiredCodes.filter(c => !isCourseCompleted(completedCourses, c));
          validBranches.push({ branch, unmet, allBranchCodes: requiredCodes });
        }
      }

      if (anyBranchSatisfied) {
        return { isLocked: false, unmetPrereqs: [], unmetDescriptions: [], clauses: [] };
      }

      if (validBranches.length === 0) {
        return { isLocked: false, unmetPrereqs: [], unmetDescriptions: [], clauses: [] };
      }

      validBranches.sort((a, b) => a.unmet.length - b.unmet.length);
      const chosen = validBranches[0];
      return {
        isLocked: chosen.unmet.length > 0,
        unmetPrereqs: chosen.unmet,
        unmetDescriptions: chosen.unmet,
        clauses: validBranches.map(v => v.allBranchCodes)
      };
    }
  }
  const clauses = parsePrereqClauses(prereqText);
  if (clauses.length === 0) {
    return { isLocked: false, unmetPrereqs: [], unmetDescriptions: [], clauses: [] };
  }

  const unmetCodes: string[] = [];
  const unmetDescriptions: string[] = [];

  for (const clause of clauses) {
    const isSatisfied = clause.some(code => isCourseCompleted(completedCourses, code));
    if (isSatisfied) {
      continue;
    }
    if (majorCourseCodes && majorCourseCodes.length > 0) {
      const inMajor = clause.filter(code =>
        majorCourseCodes.some(mCode => areCourseCodesEqual(mCode, code))
      );
      if (inMajor.length === 0) {
        continue;
      }

      unmetCodes.push(...inMajor);
      unmetDescriptions.push(inMajor.join(' أو '));
    } else {
      unmetCodes.push(...clause);
      unmetDescriptions.push(clause.join(' أو '));
    }
  }

  return {
    isLocked: unmetDescriptions.length > 0,
    unmetPrereqs: Array.from(new Set(unmetCodes)),
    unmetDescriptions,
    clauses
  };
}

export function computeAcademicProgress(
  majors: any[],
  subjects: any[],
  majorName: string,
  completedCourses: string[]
) {
  const userMajor = majors.find(m => m.name === majorName || m.name?.trim() === majorName?.trim());
  const displayedSubjects = userMajor && userMajor.courseIds && userMajor.courseIds.length > 0
    ? subjects.filter(s => userMajor.courseIds.some((cid: any) => String(cid) === String(s.id)))
    : subjects;

  const groups = (Object.entries(
    displayedSubjects.reduce((acc, s) => {
      let g = s.level ? `المستوى ${s.level}` : 'المتطلبات العامة';
      let reqCount = 0;
      let prereq = s.prereq || null;
      if (userMajor && userMajor.courses) {
        const c = userMajor.courses.find((mc: any) => String(mc.subjectId) === String(s.id));
        if (c) {
          if (c.prereq) prereq = c.prereq;
          if (c.optionalGroup && c.optionalGroup !== 'المتطلبات العامة') {
            g = c.optionalGroup;
            reqCount = Number(c.optionalGroupReqCount) || 0;
          } else if (c.optionalGroupReqCount) {
            reqCount = Number(c.optionalGroupReqCount) || 0;
          }
        }
      }
      if (!acc[g]) acc[g] = [];
      acc[g].push({...s, reqCount, prereq});
      return acc;
    }, {} as Record<string, any[]>)
  ) as [string, any[]][]).sort((a, b) => {
    const matchA = a[0].match(/المستوى\s+(\d+)/);
    const matchB = b[0].match(/المستوى\s+(\d+)/);
    if (matchA && matchB) return parseInt(matchA[1]) - parseInt(matchB[1]);
    if (matchA) return -1;
    if (matchB) return 1;
    return a[0].localeCompare(b[0], 'ar');
  });

  let totalReq = 0;
  let totalFinishedInReq = 0;
  let totalFinishedHours = 0;

  displayedSubjects.forEach(s => {
    if (isCourseCompleted(completedCourses, s.code)) {
      totalFinishedHours += Number(s.creditHours || 3);
    }
  });
  const electiveGroupNames = new Set<string>();
  let sharedElectiveReq = 0;

  if (userMajor && Array.isArray(userMajor.batches)) {
    const electiveBatches = userMajor.batches.filter((b: any) => b.type === 'elective');
    if (electiveBatches.length > 0) {
      electiveBatches.forEach((b: any) => electiveGroupNames.add(b.name));
      sharedElectiveReq = Number(electiveBatches[0].reqCount) || 0;
    }
  }
  if (electiveGroupNames.size === 0) {
    groups.forEach(([gName, gSubjects]) => {
      if (gName.includes('المجموعة الاختيارية') || gName.includes('المجموعات الاختيارية') || (gName.includes('اختيار') && !gName.startsWith('المستوى'))) {
        electiveGroupNames.add(gName);
        if (sharedElectiveReq === 0) {
          sharedElectiveReq = Number(gSubjects[0]?.reqCount) || 2;
        }
      }
    });
  }

  let totalElectiveFinished = 0;
  const completedElectiveCodes = new Set<string>();

  groups.forEach(([groupName, groupSubjects]) => {
    if (electiveGroupNames.has(groupName)) {
      groupSubjects.forEach(s => {
        if (isCourseCompleted(completedCourses, s.code)) {
          const norm = normalizeCourseCode(s.code).replace(/\s+/g, '').toLowerCase();
          completedElectiveCodes.add(norm);
        }
      });
      return;
    }

    const totalInGroup = groupSubjects.length;
    const declaredReqCount = Number(groupSubjects[0]?.reqCount) || 0;
    const isLevelGroup = groupName.startsWith('المستوى');
    const reqCount = (declaredReqCount > 0 && !isLevelGroup) ? declaredReqCount : totalInGroup;
    const selectedInGroup = groupSubjects.filter(s => isCourseCompleted(completedCourses, s.code)).length;
    
    totalReq += Number(reqCount);
    totalFinishedInReq += Math.min(selectedInGroup, Number(reqCount));
  });

  totalElectiveFinished = completedElectiveCodes.size;

  if (electiveGroupNames.size > 0 && sharedElectiveReq > 0) {
    totalReq += sharedElectiveReq;
    totalFinishedInReq += Math.min(totalElectiveFinished, sharedElectiveReq);
  }

  const percentFinished = totalReq > 0 ? Math.round((totalFinishedInReq / totalReq) * 100) : 0;
  const allGroupNames = groups.map(g => g[0]);

  return {
    userMajor,
    displayedSubjects,
    groups,
    totalReq,
    totalFinishedInReq,
    totalFinishedHours,
    percentFinished,
    allGroupNames,
    electiveInfo: {
      isShared: electiveGroupNames.size > 0,
      sharedReq: sharedElectiveReq,
      totalFinished: totalElectiveFinished,
      groupNames: Array.from(electiveGroupNames),
    }
  };
}
