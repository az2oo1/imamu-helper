'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Edit3,
  MoreVertical,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Layers,
  Info,
  BookOpen,
  AlertTriangle,
  FolderPlus,
  GripVertical,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { matchArabicSearch } from '../../lib/search-utils';
import { normalizeCourseCode } from '../../lib/academic-utils';

export type BatchType = 'level' | 'requirement' | 'elective';

export interface BatchItem {
  id: string;
  type: BatchType;
  name: string;
  reqCount: string;
}

export interface MajorCourseItem {
  subjectId: number;
  optionalGroup?: string;
  optionalGroupReqCount?: string;
  prereq?: string;
}

export interface MajorFormData {
  id?: number;
  name: string;
  courses: MajorCourseItem[];
  batches: BatchItem[];
}

interface AdminMajorsTabProps {
  majors: any[];
  subjects: any[];
  fetchData: () => Promise<void> | void;
  toast: (type: any, text: string) => void;
  getToken: () => Promise<string>;
  initialSearch?: string;
}

export default function AdminMajorsTab({
  majors,
  subjects,
  fetchData,
  toast,
  getToken,
  initialSearch,
}: AdminMajorsTabProps) {
  // Main view state: list / grid vs editor wizard
  const [isMajorEditorOpen, setIsMajorEditorOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [majorSearch, setMajorSearch] = useState(initialSearch || '');

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setMajorSearch(initialSearch);
    }
  }, [initialSearch]);

  const [openMajorMenuId, setOpenMajorMenuId] = useState<number | null>(null);
  const [deleteConfirmMajor, setDeleteConfirmMajor] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [majorForm, setMajorForm] = useState<MajorFormData>({
    id: undefined,
    name: '',
    courses: [],
    batches: [],
  });

  // Step 1: Configured counts
  const [countsConfig, setCountsConfig] = useState({
    levelsCount: 8,
    reqBatchesCount: 1,
    deptElectivesCount: 2,
  });

  // Step 1 & 2: Configured counts & shared elective requirement
  const [deptElectivesSharedReqCount, setDeptElectivesSharedReqCount] = useState<string>('2');

  // Step 3: Shelves filter & catalog picker modal
  const [batchTabFilter, setBatchTabFilter] = useState<'all' | 'levels' | 'requirements' | 'electives'>('all');
  const [batchInlineSearches, setBatchInlineSearches] = useState<Record<string, string>>({});
  const [targetBatchForPicker, setTargetBatchForPicker] = useState<string | null>(null);
  const [coursePickerSearch, setCoursePickerSearch] = useState('');
  const deferredSearch = useDeferredValue(coursePickerSearch);
  const [displayLimit, setDisplayLimit] = useState(60);
  const [selectedCourseIdsForPicker, setSelectedCourseIdsForPicker] = useState<number[]>([]);

  // Drag-and-drop state for moving courses between batches/shelves
  const [draggedSubjectId, setDraggedSubjectId] = useState<number | null>(null);
  const [dragOverBatchId, setDragOverBatchId] = useState<string | null>(null);

  // Fast pre-indexed catalog (deduplicated by normalized course code, precomputed search strings)
  const catalogIndex = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{
      id: number;
      code: string;
      name: string;
      creditHours: number;
      normCode: string;
      searchCode: string;
      searchName: string;
    }> = [];

    for (const s of subjects) {
      const norm = normalizeCourseCode(s.code).replace(/\s+/g, '').toLowerCase();
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);

      list.push({
        id: s.id,
        code: s.code,
        name: s.name,
        creditHours: s.creditHours || 3,
        normCode: norm,
        searchCode: (s.code || '').toLowerCase(),
        searchName: (s.name || '').toLowerCase(),
      });
    }
    return list;
  }, [subjects]);

  // Fast precomputed sets of courses already assigned to the major
  const majorSubjectIdSet = useMemo(() => {
    return new Set(majorForm.courses.map((c) => c.subjectId));
  }, [majorForm.courses]);

  const majorNormCodeSet = useMemo(() => {
    const set = new Set<string>();
    const subMap = new Map(subjects.map((s) => [s.id, normalizeCourseCode(s.code).replace(/\s+/g, '').toLowerCase()]));
    for (const c of majorForm.courses) {
      const n = subMap.get(c.subjectId);
      if (n) set.add(n);
    }
    return set;
  }, [majorForm.courses, subjects]);

  // Ultra-fast filtered catalog search computed via deferred value
  const filteredCatalogSubjects = useMemo(() => {
    const q = deferredSearch.trim();
    if (!q) return catalogIndex;

    return catalogIndex.filter(
      (item) =>
        matchArabicSearch(item.name, q) ||
        matchArabicSearch(item.code, q) ||
        item.searchCode.includes(q.toLowerCase())
    );
  }, [catalogIndex, deferredSearch]);

  // Filtered majors for Grid
  const filteredMajors = useMemo(() => {
    return majors.filter((m) => matchArabicSearch(m.name, majorSearch));
  }, [majors, majorSearch]);

  // Handle open add major wizard
  const handleAddNewMajor = () => {
    const defaultBatches: BatchItem[] = [];
    for (let i = 1; i <= 8; i++) {
      defaultBatches.push({ id: `level-${i}`, type: 'level', name: `المستوى ${i}`, reqCount: '1' });
    }
    defaultBatches.push({ id: 'req-1', type: 'requirement', name: 'متطلبات الكلية والجامعة', reqCount: '3' });
    defaultBatches.push({ id: 'elec-1', type: 'elective', name: 'المجموعة الاختيارية 1 بقسم التخصص', reqCount: '2' });
    defaultBatches.push({ id: 'elec-2', type: 'elective', name: 'المجموعة الاختيارية 2 بقسم التخصص', reqCount: '2' });

    setDeptElectivesSharedReqCount('2');
    setMajorForm({ id: undefined, name: '', courses: [], batches: defaultBatches });
    setCountsConfig({ levelsCount: 8, reqBatchesCount: 1, deptElectivesCount: 2 });
    setActiveStep(1);
    setIsMajorEditorOpen(true);
  };

  // Handle open edit major wizard
  const handleEditMajor = (m: any) => {
    const courses: MajorCourseItem[] =
      m.courses?.map((c: any) => ({
        subjectId: Number(c.subjectId),
        optionalGroup: c.optionalGroup || '',
        optionalGroupReqCount: c.optionalGroupReqCount?.toString() || '1',
        prereq: c.prereq || '',
      })) || [];

    let batches: BatchItem[] = [];

    // 1. If major has explicitly saved batches from DB, use them directly
    if (m.batches && Array.isArray(m.batches) && m.batches.length > 0) {
      batches = m.batches.map((b: any, idx: number) => ({
        id: b.id || `batch-${idx + 1}`,
        type: (b.type as BatchType) || 'requirement',
        name: b.name || '',
        reqCount: b.reqCount?.toString() || '1',
      }));
    } else {
      // 2. Fallback reconstruction from courses if batches were not previously saved
      const bMap = new Map<string, string>();
      courses.forEach((c) => {
        if (c.optionalGroup) bMap.set(c.optionalGroup, c.optionalGroupReqCount || '1');
      });

      let autoId = 1;
      batches = Array.from(bMap.entries()).map(([name, reqCount]) => {
        let type: BatchType = 'requirement';
        if (name.startsWith('المستوى')) {
          type = 'level';
        } else if (name.includes('اختيار')) {
          type = 'elective';
        } else if (name.includes('متطلب')) {
          type = 'requirement';
        }
        return {
          id: `batch-${autoId++}`,
          type,
          name,
          reqCount,
        };
      });

      batches.sort((a, b) => {
        const matchA = a.name.match(/المستوى\s+(\d+)/);
        const matchB = b.name.match(/المستوى\s+(\d+)/);
        if (matchA && matchB) return parseInt(matchA[1]) - parseInt(matchB[1]);
        if (matchA) return -1;
        if (matchB) return 1;
        return a.name.localeCompare(b.name, 'ar');
      });
    }

    const levelsCount = batches.filter((b) => b.type === 'level').length;
    const reqBatchesCount = batches.filter((b) => b.type === 'requirement').length;
    const deptElectivesCount = batches.filter((b) => b.type === 'elective').length;

    const firstElectiveReq = batches.find((b) => b.type === 'elective')?.reqCount || '2';
    setDeptElectivesSharedReqCount(firstElectiveReq);

    setCountsConfig({
      levelsCount: levelsCount || 8,
      reqBatchesCount: reqBatchesCount,
      deptElectivesCount: deptElectivesCount,
    });
    setMajorForm({ id: m.id, name: m.name, courses, batches });
    setActiveStep(1);
    setIsMajorEditorOpen(true);
  };

  // Helper to sync structure when transitioning from Step 1 -> Step 2
  const syncBatchesFromCounts = () => {
    const currentLevels = majorForm.batches.filter((b) => b.type === 'level');
    const currentReqs = majorForm.batches.filter((b) => b.type === 'requirement');
    const currentElectives = majorForm.batches.filter((b) => b.type === 'elective');

    // 1. Levels
    const newLevels: BatchItem[] = [];
    for (let i = 1; i <= countsConfig.levelsCount; i++) {
      if (i - 1 < currentLevels.length) {
        newLevels.push(currentLevels[i - 1]);
      } else {
        newLevels.push({
          id: `level-${Date.now()}-${i}`,
          type: 'level',
          name: `المستوى ${i}`,
          reqCount: '1',
        });
      }
    }

    // 2. Requirement Batches
    const newReqs: BatchItem[] = [];
    for (let i = 1; i <= countsConfig.reqBatchesCount; i++) {
      if (i - 1 < currentReqs.length) {
        newReqs.push(currentReqs[i - 1]);
      } else {
        const defaultName =
          countsConfig.reqBatchesCount === 1
            ? 'متطلبات الكلية والجامعة'
            : `حزمة متطلبات الكلية والجامعة ${i}`;
        newReqs.push({
          id: `req-${Date.now()}-${i}`,
          type: 'requirement',
          name: defaultName,
          reqCount: '3',
        });
      }
    }

    // 3. Dept Electives
    const newElectives: BatchItem[] = [];
    for (let i = 1; i <= countsConfig.deptElectivesCount; i++) {
      if (i - 1 < currentElectives.length) {
        newElectives.push({
          ...currentElectives[i - 1],
          reqCount: deptElectivesSharedReqCount,
        });
      } else {
        newElectives.push({
          id: `elec-${Date.now()}-${i}`,
          type: 'elective',
          name: `المجموعة الاختيارية ${i} بقسم التخصص`,
          reqCount: deptElectivesSharedReqCount,
        });
      }
    }

    setMajorForm((f) => ({
      ...f,
      batches: [...newLevels, ...newReqs, ...newElectives],
    }));
  };

  // Step 1 Validation & Next
  const handleStep1Next = () => {
    if (!majorForm.name.trim()) {
      toast('error', 'يرجى كتابة اسم التخصص الأكاديمي أولاً');
      return;
    }
    syncBatchesFromCounts();
    setActiveStep(2);
  };

  // Step 2 Validation & Next
  const handleStep2Next = () => {
    if (majorForm.batches.length === 0) {
      toast('error', 'يرجى التأكد من وجود حزمة أو مستوى دراسي واحد على الأقل');
      return;
    }
    // Sync reqCount to any already assigned courses
    const bReqMap = new Map<string, string>();
    majorForm.batches.forEach((b) => {
      bReqMap.set(b.name, b.reqCount);
    });

    setMajorForm((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => {
        if (c.optionalGroup && bReqMap.has(c.optionalGroup)) {
          return {
            ...c,
            optionalGroupReqCount: bReqMap.get(c.optionalGroup),
          };
        }
        return c;
      }),
    }));

    setActiveStep(3);
  };

  // Batch mutation helpers by stable ID
  const handleRenameBatch = (id: string, newName: string) => {
    setMajorForm((prev) => {
      const target = prev.batches.find((b) => b.id === id);
      if (!target) return prev;
      const oldName = target.name;
      return {
        ...prev,
        batches: prev.batches.map((b) => (b.id === id ? { ...b, name: newName } : b)),
        courses: prev.courses.map((c) =>
          c.optionalGroup === oldName ? { ...c, optionalGroup: newName } : c
        ),
      };
    });
  };

  const handleUpdateBatchReqCount = (id: string, reqCount: string) => {
    setMajorForm((prev) => {
      const target = prev.batches.find((b) => b.id === id);
      if (!target) return prev;
      return {
        ...prev,
        batches: prev.batches.map((b) => (b.id === id ? { ...b, reqCount } : b)),
        courses: prev.courses.map((c) =>
          c.optionalGroup === target.name ? { ...c, optionalGroupReqCount: reqCount } : c
        ),
      };
    });
  };

  const handleUpdateSharedElectiveReqCount = (val: string) => {
    setDeptElectivesSharedReqCount(val);
    setMajorForm((prev) => ({
      ...prev,
      batches: prev.batches.map((b) =>
        b.type === 'elective' ? { ...b, reqCount: val } : b
      ),
      courses: prev.courses.map((c) => {
        const matchingBatch = prev.batches.find((b) => b.name === c.optionalGroup);
        if (matchingBatch && matchingBatch.type === 'elective') {
          return { ...c, optionalGroupReqCount: val };
        }
        return c;
      }),
    }));
  };

  const handleDeleteBatch = (id: string) => {
    setMajorForm((prev) => {
      const target = prev.batches.find((b) => b.id === id);
      if (!target) return prev;
      if (target.type === 'level') {
        setCountsConfig((c) => ({ ...c, levelsCount: Math.max(1, c.levelsCount - 1) }));
      } else if (target.type === 'requirement') {
        setCountsConfig((c) => ({ ...c, reqBatchesCount: Math.max(0, c.reqBatchesCount - 1) }));
      } else if (target.type === 'elective') {
        setCountsConfig((c) => ({ ...c, deptElectivesCount: Math.max(0, c.deptElectivesCount - 1) }));
      }
      return {
        ...prev,
        batches: prev.batches.filter((b) => b.id !== id),
        courses: prev.courses.map((c) =>
          c.optionalGroup === target.name
            ? { ...c, optionalGroup: '', optionalGroupReqCount: '1' }
            : c
        ),
      };
    });
  };

  const handleAddBatch = (type: BatchType) => {
    const id = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let name = '';
    let reqCount = '1';
    if (type === 'level') {
      const nextNum = levelBatches.length + 1;
      name = `المستوى ${nextNum}`;
      reqCount = '1';
      setCountsConfig((c) => ({ ...c, levelsCount: c.levelsCount + 1 }));
    } else if (type === 'requirement') {
      const nextNum = reqBatches.length + 1;
      name = `حزمة متطلبات الكلية والجامعة ${nextNum}`;
      reqCount = '3';
      setCountsConfig((c) => ({ ...c, reqBatchesCount: c.reqBatchesCount + 1 }));
    } else {
      const nextNum = deptElectiveBatches.length + 1;
      name = `المجموعة الاختيارية ${nextNum} بقسم التخصص`;
      reqCount = deptElectivesSharedReqCount;
      setCountsConfig((c) => ({ ...c, deptElectivesCount: c.deptElectivesCount + 1 }));
    }
    setMajorForm((prev) => ({
      ...prev,
      batches: [...prev.batches, { id, type, name, reqCount }],
    }));
  };

  // Final Save
  const handleSaveMajor = async () => {
    if (!majorForm.name.trim()) {
      toast('error', 'يرجى كتابة اسم التخصص');
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      const url = majorForm.id ? `/api/admin/majors/${majorForm.id}` : '/api/admin/majors';
      const method = majorForm.id ? 'PUT' : 'POST';

      // Ensure courses reflect current batch reqCount
      const bReqMap = new Map<string, string>();
      majorForm.batches.forEach((b) => {
        bReqMap.set(b.name, b.reqCount);
      });

      const syncedCourses = majorForm.courses.map((c) => ({
        ...c,
        optionalGroupReqCount: (c.optionalGroup && bReqMap.has(c.optionalGroup))
          ? bReqMap.get(c.optionalGroup)
          : (c.optionalGroupReqCount || '1'),
      }));

      const payload = {
        name: majorForm.name,
        batches: majorForm.batches,
        courses: syncedCourses,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast('success', majorForm.id ? 'تم تحديث التخصص والخطة بنجاح' : 'تم إنشاء التخصص والخطة الدراسية بنجاح');
        await fetchData();
        setIsMajorEditorOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast('error', err.error || err.message || 'فشل حفظ التخصص');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'حدث خطأ في الاتصال أثناء حفظ التخصص');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete major
  const handleDeleteMajorConfirm = async () => {
    if (!deleteConfirmMajor) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/majors/${deleteConfirmMajor.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast('success', `تم حذف تخصص "${deleteConfirmMajor.name}" بنجاح`);
        setDeleteConfirmMajor(null);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast('error', err.error || err.message || 'فشل حذف التخصص');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'حدث خطأ أثناء حذف التخصص');
    } finally {
      setIsDeleting(false);
    }
  };

  // Grouped batches for Step 2 and Step 3 based purely on immutable type
  const levelBatches = useMemo(
    () => majorForm.batches.filter((b) => b.type === 'level'),
    [majorForm.batches]
  );
  const reqBatches = useMemo(
    () => majorForm.batches.filter((b) => b.type === 'requirement'),
    [majorForm.batches]
  );
  const deptElectiveBatches = useMemo(
    () => majorForm.batches.filter((b) => b.type === 'elective'),
    [majorForm.batches]
  );

  // Stepper steps configuration
  const stepsConfig = [
    { id: 1, title: 'الأساسيات والهيكل', subtitle: 'اسم التخصص وأعداد الحزم' },
    { id: 2, title: 'تسمية الحزم والمتطلبات', subtitle: 'تسمية كل حزمة وكم مطلوب لإنهائها' },
    { id: 3, title: 'توزيع وتعيين المقررات', subtitle: 'إسناد المقررات للحزم والمستويات' },
  ];

  // ============================================================================
  // 1. MAIN VIEW: MAJORS GRID VIEW
  // ============================================================================
  if (!isMajorEditorOpen) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        {/* Top Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-[var(--color-imamu-brown)]" />
              <span>الخطط والتخصصات الأكاديمية ({majors.length})</span>
            </h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              استعراض التخصصات وإدارة الخطط والمستويات والحزم والمقررات الدراسية.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            rounded="2xl"
            onClick={handleAddNewMajor}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-md shadow-[var(--color-imamu-brown)/20] shrink-0"
          >
            إضافة تخصص جديد
          </Button>
        </div>

        {/* Main Card Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-5">
          {/* Search Box Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث باسم التخصص الأكاديمي..."
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 transition"
              />
              {majorSearch && (
                <button
                  type="button"
                  onClick={() => setMajorSearch('')}
                  className="absolute left-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              عرض {filteredMajors.length} من أصل {majors.length} تخصص
            </div>
          </div>

          {/* Majors Responsive Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
            {filteredMajors.map((m) => {
              const coursesCount = m.courses?.length || 0;
              const batchesSet = new Set<string>();
              let levelsCount = 0;

              m.courses?.forEach((c: any) => {
                if (c.optionalGroup) batchesSet.add(c.optionalGroup);
              });

              batchesSet.forEach((b) => {
                if (b.startsWith('المستوى')) levelsCount++;
              });

              const totalCreditHours = (m.courses || []).reduce((acc: number, c: any) => {
                const subj = subjects.find((s) => s.id === Number(c.subjectId));
                return acc + (subj?.creditHours ? Number(subj.creditHours) : 3);
              }, 0);

              const isMenuOpen = openMajorMenuId === m.id;

              return (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-4 hover:border-[var(--color-imamu-brown)]/50 hover:shadow-md transition group relative"
                >
                  <div className="space-y-3">
                    {/* Card Top: Icon, Name, and 3-Dots Action Menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0 text-[var(--color-imamu-brown)] shadow-2xs">
                          <GraduationCap className="w-6 h-6 stroke-[1.75]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-[var(--color-imamu-brown)] transition">
                            {m.name}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                            خطة أكاديمية معتمدة
                          </span>
                        </div>
                      </div>

                      {/* 3-Dots Action Menu */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMajorMenuId(isMenuOpen ? null : m.id)}
                          className="p-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border border-slate-200 dark:border-zinc-800 shadow-2xs"
                          title="خيارات إضافية"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMajorMenuId(null)} />
                            <div className="absolute left-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl py-1.5 z-50">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMajorMenuId(null);
                                  handleEditMajor(m);
                                }}
                                className="w-full px-3 py-2 text-right text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[var(--color-imamu-brown)]" />
                                <span>تعديل الخطة والتخصص</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMajorMenuId(null);
                                  setDeleteConfirmMajor(m);
                                }}
                                className="w-full px-3 py-2 text-right text-xs font-semibold flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف التخصص</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">المقررات</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                          {coursesCount} مقرر
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">المستويات</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                          {levelsCount || 8} مستويات
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">الحزم والمجموعات</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                          {batchesSet.size} حزمة
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">الساعات المعتمدة</span>
                        <span className="font-bold text-xs text-[var(--color-imamu-brown)] mt-0.5">
                          {totalCreditHours} ساعة
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Button */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
                    <Button
                      variant="outline"
                      size="sm"
                      rounded="xl"
                      onClick={() => handleEditMajor(m)}
                      className="w-full text-xs font-bold"
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      إدارة الخطة وتوزيع المقررات
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredMajors.length === 0 && (
            <div className="py-16 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3">
              <GraduationCap className="w-12 h-12 text-slate-300 dark:text-zinc-700 stroke-1" />
              <h5 className="font-bold text-base text-slate-900 dark:text-white">
                {majorSearch ? 'لا توجد تخصصات مطابقة لبحثك' : 'لا توجد تخصصات مضافة حتى الآن'}
              </h5>
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
                {majorSearch
                  ? 'جرب البحث باسم أو مصطلح آخر'
                  : 'ابدأ بإنشاء أول خطة تخصص أكاديمي الآن عبر الضغط على الزر أدناه'}
              </p>
              <Button
                variant="primary"
                size="md"
                rounded="2xl"
                onClick={handleAddNewMajor}
                leftIcon={<Plus className="w-4 h-4" />}
                className="mt-2"
              >
                إضافة تخصص جديد
              </Button>
            </div>
          )}
        </div>

        {/* Delete Major Confirmation Dialog */}
        {deleteConfirmMajor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                <div className="p-3 bg-rose-500/10 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">تأكيد حذف التخصص</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">هذا الإجراء سيحذف خطة التخصص وجميع ارتباطاتها</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200">
                هل أنت متأكد من حذف تخصص «{deleteConfirmMajor.name}»؟
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  rounded="xl"
                  onClick={() => setDeleteConfirmMajor(null)}
                  disabled={isDeleting}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  rounded="xl"
                  onClick={handleDeleteMajorConfirm}
                  isLoading={isDeleting}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  حذف التخصص نهائياً
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. DEDICATED WIZARD VIEW: MAJOR BUILDER & EDITOR
  // ============================================================================
  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Wizard Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMajorEditorOpen(false)}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition cursor-pointer shadow-2xs"
            title="العودة إلى التخصصات"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
              {majorForm.id ? `تعديل خطة: ${majorForm.name}` : 'إضافة تخصص جديد وبناء الخطة الدراسية'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              حدد اسم التخصص، وأعداد الحزم والمجموعات، ثم سمّ كل حزمة ووزّع المقررات عليها بسهولة.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="md"
          rounded="2xl"
          onClick={() => setIsMajorEditorOpen(false)}
        >
          إلغاء والعودة للقائمة
        </Button>
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="relative pt-1 px-4">
          {/* Background Line */}
          <div
            className="absolute top-4 h-0.5 bg-slate-200 dark:bg-zinc-800 -z-0"
            style={{
              right: `${100 / (2 * 3)}%`,
              left: `${100 / (2 * 3)}%`,
            }}
          >
            {/* Active Progress Line */}
            <div
              className="h-full bg-[var(--color-imamu-brown)] rounded-full transition-all duration-300"
              style={{ width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%' }}
            />
          </div>

          {/* Stepper Nodes */}
          <div className="relative z-10 grid grid-cols-3 w-full">
            {stepsConfig.map((s) => {
              const isCompleted = activeStep > s.id;
              const isActive = activeStep === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id === 1) setActiveStep(1);
                    else if (s.id === 2 && majorForm.name.trim()) handleStep1Next();
                    else if (s.id === 3 && majorForm.name.trim()) handleStep2Next();
                  }}
                  className="flex flex-col items-center gap-2 cursor-pointer group text-center"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCompleted
                        ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                        : isActive
                        ? 'bg-[var(--color-imamu-brown)] text-white ring-4 ring-[var(--color-imamu-brown)]/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.id}
                  </div>
                  <div>
                    <span
                      className={`block text-xs font-bold ${
                        isActive
                          ? 'text-[var(--color-imamu-brown)]'
                          : isCompleted
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="hidden sm:block text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {s.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* STEP 1: Basic Info & Structure Setup */}
      {/* ==================================================================== */}
      {activeStep === 1 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-zinc-800 pb-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>اسم التخصص الأكاديمي وتحديد أعداد الهيكل</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              أدخل اسم التخصص وحدد أعداد المستويات والحزم لتهيئة هيكل الخطة بشكل تلقائي.
            </p>
          </div>

          {/* Major Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              اسم التخصص الأكاديمي <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: هندسة البرمجيات، علوم الحاسب، نظم المعلومات..."
              value={majorForm.name}
              onChange={(e) => setMajorForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 transition"
            />
          </div>

          {/* 3 Structure Counts Cards */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              تحديد أعداد الحزم والمجموعات بالخطة
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Levels */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    <Layers className="w-5 h-5 text-[var(--color-imamu-brown)]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">المستويات الدراسية</h5>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">الفصول الأكاديمية (افتراضياً 8)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-2 border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, levelsCount: Math.max(1, c.levelsCount - 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-base font-extrabold text-[var(--color-imamu-brown)]">
                    {countsConfig.levelsCount} مستويات
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, levelsCount: Math.min(14, c.levelsCount + 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Card 2: Requirement Batches */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    <BookOpen className="w-5 h-5 text-[var(--color-imamu-brown)]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">حزم متطلبات الكلية والجامعة</h5>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">المقررات العامة والإلزامية</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-2 border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, reqBatchesCount: Math.max(0, c.reqBatchesCount - 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-base font-extrabold text-[var(--color-imamu-brown)]">
                    {countsConfig.reqBatchesCount} حزم
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, reqBatchesCount: Math.min(10, c.reqBatchesCount + 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Card 3: Major Electives */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    <FolderPlus className="w-5 h-5 text-[var(--color-imamu-brown)]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">المجموعات الاختيارية بقسم التخصص</h5>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">المسارات ومجموعات المواد الاختيارية</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-2 border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, deptElectivesCount: Math.max(0, c.deptElectivesCount - 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-base font-extrabold text-[var(--color-imamu-brown)]">
                    {countsConfig.deptElectivesCount} مجموعات
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountsConfig((c) => ({ ...c, deptElectivesCount: Math.min(15, c.deptElectivesCount + 1) }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold text-sm text-slate-700 dark:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Summary Preview Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-3">
            <Info className="w-5 h-5 text-[var(--color-imamu-brown)] shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">ملخص الهيكل المُعد: </span>
              <span>
                سيتم تهيئة {countsConfig.levelsCount} مستويات دراسية، و {countsConfig.reqBatchesCount} حزمة متطلبات عامة، و {countsConfig.deptElectivesCount} مجموعات اختيارية للتخصص.
                في الخطوة التالية ستتمكن من تسمية كل حزمة وتحديد كم مقرر مطلوب لإنهائها.
              </span>
            </div>
          </div>

          {/* Step 1 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
            <Button
              variant="secondary"
              size="md"
              rounded="xl"
              onClick={() => setIsMajorEditorOpen(false)}
            >
              إلغاء
            </Button>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={handleStep1Next}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              الخطوة التالية
            </Button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 2: Naming Batches and Setting Requirements */}
      {/* ==================================================================== */}
      {activeStep === 2 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-8">
          <div className="border-b border-slate-200 dark:border-zinc-800 pb-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>تسمية الحزم والمجموعات وتحديد كم مقرر مطلوب لإنهائها</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              قم بمراجعة وتعديل أسماء المستويات والحزم، وتحديد كم مادة مطلوب إنجازها لكل حزمة اختيارية أو متطلب.
            </p>
          </div>

          {/* Section 2.1: Levels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  المستويات الدراسية ({levelBatches.length} مستويات)
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  (كل مستوى يتطلب اجتياز جميع مقرراته)
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                rounded="lg"
                onClick={() => handleAddBatch('level')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                إضافة مستوى آخر
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {levelBatches.map((b, i) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col gap-1.5 text-center"
                >
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                    مستوى {i + 1}
                  </span>
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => handleRenameBatch(b.id, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-bold text-center text-xs text-slate-900 dark:text-white outline-hidden focus:border-[var(--color-imamu-brown)] focus:ring-1 focus:ring-[var(--color-imamu-brown)] transition"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2.2: Requirement Batches */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  حزم متطلبات الكلية والجامعة ({reqBatches.length} حزم)
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  (حزم المواد العامة المشتركة)
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                rounded="lg"
                onClick={() => handleAddBatch('requirement')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                إضافة حزمة متطلبات
              </Button>
            </div>

            {reqBatches.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-400 italic text-center">
                لا توجد حزم متطلبات مضافة. يمكنك إضافة حزمة جديدة عبر الزر أعلاه.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {reqBatches.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => handleRenameBatch(b.id, e.target.value)}
                        placeholder="اسم الحزمة..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-white outline-hidden focus:border-[var(--color-imamu-brown)] focus:ring-1 focus:ring-[var(--color-imamu-brown)] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="حذف الحزمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                        كم مقرر مطلوب لإنهائها؟
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={b.reqCount || '1'}
                          onChange={(e) => handleUpdateBatchReqCount(b.id, e.target.value)}
                          className="w-14 text-center py-1 px-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                        />
                        <span className="text-[11px] text-slate-400 font-bold">مقررات</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2.3: Department Elective Groups */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  المجموعات الاختيارية بقسم التخصص ({deptElectiveBatches.length} مجموعات)
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  (مجموعات المواد التخصصية التي يختار الطالب منها)
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                rounded="lg"
                onClick={() => handleAddBatch('elective')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                إضافة مجموعة اختيارية
              </Button>
            </div>

            {/* Shared Electives Requirement Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>المطلوب الإجمالي من المجموعات الاختيارية (متطلب مشترك)</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  تشترك جميع المجموعات الاختيارية في هذا العدد (يُطلب من الطالب اجتياز هذا العدد من أي مجموعة منها):
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={deptElectivesSharedReqCount}
                  onChange={(e) => handleUpdateSharedElectiveReqCount(e.target.value)}
                  className="w-16 text-center py-1.5 px-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs text-amber-900 dark:text-amber-200 font-bold">مقررات مطلوبة</span>
              </div>
            </div>

            {deptElectiveBatches.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-400 italic text-center">
                لا توجد مجموعات اختيارية مضافة. يمكنك إضافة مجموعة اختيارية جديدة عبر الزر أعلاه.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {deptElectiveBatches.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => handleRenameBatch(b.id, e.target.value)}
                        placeholder="اسم المجموعة الاختيارية..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-white outline-hidden focus:border-[var(--color-imamu-brown)] focus:ring-1 focus:ring-[var(--color-imamu-brown)] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="حذف المجموعة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                        المطلوب:
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {deptElectivesSharedReqCount} مقررات (مشترك)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
            <Button
              variant="secondary"
              size="md"
              rounded="xl"
              onClick={() => setIsMajorEditorOpen(false)}
            >
              إلغاء
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                rounded="xl"
                onClick={() => setActiveStep(1)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                السابق
              </Button>
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={handleStep2Next}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                الخطوة التالية
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: Assigning Courses to Batches */}
      {/* ==================================================================== */}
      {activeStep === 3 && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>توزيع وتعيين المقررات على الحزم والمستويات</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                ابحث عن أي مقرر وأضفه للحزمة المناسبة، أو افتح نافذة الإضافة المتعددة من الكتالوج العام.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                rounded="xl"
                onClick={() => {
                  setTargetBatchForPicker(majorForm.batches[0]?.name || null);
                  setCoursePickerSearch('');
                  setSelectedCourseIdsForPicker([]);
                  setDisplayLimit(60);
                }}
                leftIcon={<FolderPlus className="w-4 h-4 text-[var(--color-imamu-brown)]" />}
              >
                إضافة مقررات من الكتالوج
              </Button>
            </div>
          </div>

          {/* Batches Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setBatchTabFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                batchTabFilter === 'all'
                  ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              جميع الحزم ({majorForm.batches.length})
            </button>
            <button
              type="button"
              onClick={() => setBatchTabFilter('levels')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                batchTabFilter === 'levels'
                  ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              المستويات الدراسية ({levelBatches.length})
            </button>
            <button
              type="button"
              onClick={() => setBatchTabFilter('requirements')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                batchTabFilter === 'requirements'
                  ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              متطلبات الكلية والجامعة ({reqBatches.length})
            </button>
            <button
              type="button"
              onClick={() => setBatchTabFilter('electives')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                batchTabFilter === 'electives'
                  ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              المجموعات الاختيارية ({deptElectiveBatches.length})
            </button>
          </div>

          {/* Unassigned Courses Notice (if any) */}
          {(() => {
            const unassignedCourses = majorForm.courses.filter(
              (c) => !c.optionalGroup || !majorForm.batches.some((b) => b.name === c.optionalGroup)
            );
            if (unassignedCourses.length === 0) return null;

            return (
              <div className="rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-imamu-brown)] shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      مقررات غير مخصصة لمستوى أو حزمة ({unassignedCourses.length} مقرر)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setMajorForm((f) => ({
                        ...f,
                        courses: f.courses.filter(
                          (c) => c.optionalGroup && f.batches.some((b) => b.name === c.optionalGroup)
                        ),
                      }))
                    }
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    حذف المقررات غير الموزعة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {unassignedCourses.map((c) => {
                    const subj = subjects.find((s) => s.id === c.subjectId);
                    if (!subj) return null;
                    return (
                      <div
                        key={c.subjectId}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ subjectId: c.subjectId, sourceBatch: '' })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedSubjectId(c.subjectId);
                        }}
                        onDragEnd={() => {
                          setDraggedSubjectId(null);
                          setDragOverBatchId(null);
                        }}
                        className={`group p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs shadow-2xs select-none cursor-grab active:cursor-grabbing hover:border-[var(--color-imamu-brown)]/40 ${
                          draggedSubjectId === c.subjectId
                            ? 'opacity-40 scale-95 border-dashed border-[var(--color-imamu-brown)]'
                            : ''
                        }`}
                        title="اسحب هذا المقرر وأفلته في أي حزمة أو مستوى أدناه"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-[var(--color-imamu-brown)] shrink-0 transition" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-[var(--color-imamu-brown)]">{subj.code}</span>
                            <div className="truncate text-[11px] text-slate-700 dark:text-zinc-300 font-medium">
                              {subj.name}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setMajorForm((f) => ({
                              ...f,
                              courses: f.courses.filter((crs) => crs.subjectId !== c.subjectId),
                            }))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer shrink-0"
                          title="حذف المقرر"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Batches Shelves Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {majorForm.batches
              .filter((b) => {
                if (batchTabFilter === 'levels') return b.type === 'level';
                if (batchTabFilter === 'requirements') return b.type === 'requirement';
                if (batchTabFilter === 'electives') return b.type === 'elective';
                return true;
              })
              .map((b) => {
                const batchCourses = majorForm.courses.filter((c) => c.optionalGroup === b.name);
                const inlineSearch = (batchInlineSearches[b.name] || '').trim();

                const filteredSuggestions =
                  inlineSearch.length > 0
                    ? subjects
                        .filter(
                          (s) =>
                            matchArabicSearch(s.name, inlineSearch) ||
                            matchArabicSearch(s.code, inlineSearch)
                        )
                        .slice(0, 6)
                    : [];

                return (
                  <div
                    key={b.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverBatchId !== b.id) setDragOverBatchId(b.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverBatchId === b.id) setDragOverBatchId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverBatchId(null);
                      try {
                        const raw = e.dataTransfer.getData('text/plain');
                        if (!raw) return;
                        const data = JSON.parse(raw);
                        if (data.sourceBatch === b.name) return;
                        setMajorForm((prev) => ({
                          ...prev,
                          courses: prev.courses.map((crs) =>
                            crs.subjectId === data.subjectId
                              ? {
                                  ...crs,
                                  optionalGroup: b.name,
                                  optionalGroupReqCount: b.reqCount,
                                }
                              : crs
                          ),
                        }));
                        toast('success', `تم نقل المقرر إلى "${b.name}"`);
                      } catch (err) {
                        console.error('Drag and drop error', err);
                      }
                    }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all duration-200 ${
                      dragOverBatchId === b.id
                        ? 'border-2 border-dashed border-[var(--color-imamu-brown)] bg-[var(--color-imamu-brown)]/10 ring-4 ring-[var(--color-imamu-brown)]/20 scale-[1.01]'
                        : 'bg-slate-50/70 dark:bg-zinc-950/70 border-slate-200/80 dark:border-zinc-800/80 hover:border-[var(--color-imamu-brown)]/60'
                    }`}
                  >
                    <div>
                      {/* Shelf Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {b.name}
                          </h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                            {batchCourses.length} مقرر
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {b.type === 'level'
                              ? `إلزامي: جميع المقررات (${batchCourses.length})`
                              : b.type === 'elective'
                              ? `المطلوب: ${b.reqCount || '2'} (مشترك)`
                              : `المطلوب: ${b.reqCount || '1'}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                            title="حذف الحزمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Drop Target Hint Indicator */}
                      {dragOverBatchId === b.id && (
                        <div className="mt-2 py-1.5 px-3 rounded-xl bg-[var(--color-imamu-brown)] text-white text-center font-bold text-xs animate-pulse">
                          إفلات المقرر هنا لنقله إلى "{b.name}"
                        </div>
                      )}

                      {/* Quick Add Bar Inside Shelf */}
                      <div className="pt-2 relative">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="بحث سريع وإضافة مقرر لهذه الحزمة..."
                            value={batchInlineSearches[b.name] || ''}
                            onChange={(e) =>
                              setBatchInlineSearches((prev) => ({
                                ...prev,
                                [b.name]: e.target.value,
                              }))
                            }
                            className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 placeholder-slate-400"
                          />
                        </div>

                        {/* Dropdown Suggestions */}
                        {filteredSuggestions.length > 0 && (
                          <div className="absolute right-0 left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredSuggestions.map((s) => {
                              const sNorm = normalizeCourseCode(s.code).replace(/\s+/g, '').toLowerCase();
                              const isAlreadyInMajor = majorForm.courses.some((c) => {
                                if (c.subjectId === s.id) return true;
                                const existing = subjects.find((sub) => sub.id === c.subjectId);
                                if (existing) {
                                  const existNorm = normalizeCourseCode(existing.code).replace(/\s+/g, '').toLowerCase();
                                  return existNorm === sNorm;
                                }
                                return false;
                              });

                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    if (isAlreadyInMajor) {
                                      setMajorForm((f) => ({
                                        ...f,
                                        courses: f.courses.map((c) => {
                                          const existing = subjects.find((sub) => sub.id === c.subjectId);
                                          const isMatch =
                                            c.subjectId === s.id ||
                                            (existing &&
                                              normalizeCourseCode(existing.code).replace(/\s+/g, '').toLowerCase() === sNorm);
                                          return isMatch
                                            ? {
                                                ...c,
                                                subjectId: s.id,
                                                optionalGroup: b.name,
                                                optionalGroupReqCount: b.reqCount,
                                              }
                                            : c;
                                        }),
                                      }));
                                    } else {
                                      setMajorForm((f) => ({
                                        ...f,
                                        courses: [
                                          ...f.courses,
                                          {
                                            subjectId: s.id,
                                            optionalGroup: b.name,
                                            optionalGroupReqCount: b.reqCount,
                                          },
                                        ],
                                      }));
                                    }
                                    setBatchInlineSearches((prev) => ({ ...prev, [b.name]: '' }));
                                  }}
                                  className="w-full px-3 py-2 text-right text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 transition cursor-pointer"
                                >
                                  <div>
                                    <span className="font-bold text-[var(--color-imamu-brown)]">{s.code}</span>
                                    <span className="text-slate-800 dark:text-zinc-200 mr-2 font-medium">
                                      {s.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[var(--color-imamu-brown)] font-bold">
                                    + إضافة
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Courses List in Batch */}
                      <div className="space-y-1.5 pt-2 max-h-56 overflow-y-auto custom-scrollbar">
                        {batchCourses.length === 0 ? (
                          <div className="py-4 text-center text-[11px] text-slate-400 dark:text-zinc-500 italic">
                            لا توجد مقررات مخصصة لهذه الحزمة بعد. (اسحب وأفلت المقررات هنا)
                          </div>
                        ) : (
                          batchCourses.map((c) => {
                            const subj = subjects.find((s) => s.id === c.subjectId);
                            if (!subj) return null;

                            return (
                              <div
                                key={c.subjectId}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    'text/plain',
                                    JSON.stringify({ subjectId: c.subjectId, sourceBatch: b.name })
                                  );
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedSubjectId(c.subjectId);
                                }}
                                onDragEnd={() => {
                                  setDraggedSubjectId(null);
                                  setDragOverBatchId(null);
                                }}
                                className={`group p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-2.5 text-xs shadow-2xs transition select-none cursor-grab active:cursor-grabbing hover:border-[var(--color-imamu-brown)]/50 hover:shadow-xs ${
                                  draggedSubjectId === c.subjectId
                                    ? 'opacity-40 scale-95 border-dashed border-[var(--color-imamu-brown)]'
                                    : ''
                                }`}
                                title="اسحب المقرر لنقله إلى أي حزمة أخرى"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-[var(--color-imamu-brown)] shrink-0 transition" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-[var(--color-imamu-brown)]">{subj.code}</span>
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        ({subj.creditHours || 3} س)
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200 truncate">
                                      {subj.name}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMajorForm((f) => ({
                                        ...f,
                                        courses: f.courses.filter((crs) => crs.subjectId !== c.subjectId),
                                      }))
                                    }
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                                    title="إزالة المقرر من الخطة"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Step 3 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
            <Button
              variant="secondary"
              size="md"
              rounded="xl"
              onClick={() => setIsMajorEditorOpen(false)}
            >
              إلغاء
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                rounded="xl"
                onClick={() => setActiveStep(2)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                السابق
              </Button>
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={handleSaveMajor}
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                حفظ التخصص والخطة الدراسية
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Catalog Multi-Select Modal */}
      {/* ==================================================================== */}
      {targetBatchForPicker !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-2xl w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  اختيار مقررات من الكتالوج العام
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  حدد المقررات والحزمة المستهدفة لإضافتها دفعة واحدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCourseIdsForPicker([]);
                  setTargetBatchForPicker(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Batch Selector & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                  الحزمة المستهدفة للإضافة:
                </label>
                <select
                  value={targetBatchForPicker}
                  onChange={(e) => setTargetBatchForPicker(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                >
                  {majorForm.batches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                  بحث في المقررات:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ابحث برمز المقرر أو اسمه..."
                    value={coursePickerSearch}
                    onChange={(e) => {
                      setCoursePickerSearch(e.target.value);
                      setDisplayLimit(60);
                    }}
                    className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  />
                </div>
              </div>
            </div>

            {/* Courses Selection List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2 min-h-[240px] max-h-[350px]">
              {filteredCatalogSubjects.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                  لا توجد مقررات مطابقة للبحث "{coursePickerSearch}"
                </div>
              ) : (
                <>
                  {filteredCatalogSubjects.slice(0, displayLimit).map((s) => {
                    const isSelected = selectedCourseIdsForPicker.includes(s.id);
                    const isAlreadyInMajor = majorSubjectIdSet.has(s.id) || majorNormCodeSet.has(s.normCode);

                    return (
                      <label
                        key={s.id}
                        className={`p-2.5 flex items-center justify-between gap-3 rounded-xl transition ${
                          isAlreadyInMajor
                            ? 'opacity-50 cursor-not-allowed bg-slate-50/50 dark:bg-zinc-900/40'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyInMajor}
                            onChange={(e) => {
                              if (isAlreadyInMajor) return;
                              if (e.target.checked) {
                                setSelectedCourseIdsForPicker((prev) => [...prev, s.id]);
                              } else {
                                setSelectedCourseIdsForPicker((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-[var(--color-imamu-brown)] border-slate-300 dark:border-zinc-700 disabled:opacity-50"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[var(--color-imamu-brown)]">{s.code}</span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">{s.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {s.creditHours || 3} ساعات معتمدة
                            </span>
                          </div>
                        </div>

                        {isAlreadyInMajor && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            مضاف مسبقاً
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {filteredCatalogSubjects.length > displayLimit && (
                    <div className="p-3 text-center border-t border-slate-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((prev) => prev + 60)}
                        className="text-xs font-bold text-[var(--color-imamu-brown)] hover:underline py-1.5 px-4 rounded-xl hover:bg-[var(--color-imamu-brown)]/10 transition cursor-pointer"
                      >
                        عرض المزيد من النتائج ({filteredCatalogSubjects.length - displayLimit} متبقي)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-slate-500">
                تم تحديد {selectedCourseIdsForPicker.length} مقرر
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  rounded="xl"
                  onClick={() => {
                    setSelectedCourseIdsForPicker([]);
                    setTargetBatchForPicker(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  disabled={selectedCourseIdsForPicker.length === 0 || !targetBatchForPicker}
                  onClick={() => {
                    const b = majorForm.batches.find((bt) => bt.name === targetBatchForPicker);
                    const newEntries = selectedCourseIdsForPicker.map((id) => ({
                      subjectId: id,
                      optionalGroup: targetBatchForPicker || '',
                      optionalGroupReqCount: b ? b.reqCount : '1',
                    }));

                    const selectedSubjs = subjects.filter((sub) => selectedCourseIdsForPicker.includes(sub.id));
                    const selectedNorms = new Set(
                      selectedSubjs.map((sub) => normalizeCourseCode(sub.code).replace(/\s+/g, '').toLowerCase())
                    );

                    setMajorForm((f) => {
                      const filteredCourses = f.courses.filter((c) => {
                        if (selectedCourseIdsForPicker.includes(c.subjectId)) return false;
                        const existSubj = subjects.find((sub) => sub.id === c.subjectId);
                        if (existSubj) {
                          const existNorm = normalizeCourseCode(existSubj.code).replace(/\s+/g, '').toLowerCase();
                          if (selectedNorms.has(existNorm)) return false;
                        }
                        return true;
                      });
                      return {
                        ...f,
                        courses: [...filteredCourses, ...newEntries],
                      };
                    });

                    toast('success', `تمت إضافة ${selectedCourseIdsForPicker.length} مقرر إلى "${targetBatchForPicker}"`);
                    setSelectedCourseIdsForPicker([]);
                    setTargetBatchForPicker(null);
                  }}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  إضافة المقررات المحددة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
