export interface ScheduleMeeting {
  type?: string;
  meetingType?: string;
  days?: string[] | string;
  daysString?: string;
  startTime?: string;
  endTime?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  building?: string;
  buildingCode?: string;
  room?: string;
  campus?: string;
}

export interface SectionItem {
  id: number;
  crn: string;
  sectionNumber: string;
  courseCode: string;
  courseTitle: string;
  subjectId?: number;
  academicYear?: string;
  semester?: string;
  term?: string;
  campus?: string;
  scheduleType?: string;
  instructionalMethod?: string;
  creditHours?: number;
  primaryInstructor?: string;
  instructors?: { name: string; email?: string; isPrimary?: boolean }[];
  schedules?: ScheduleMeeting[];
  scheduleSummary?: string;
  isOpen?: boolean;
  maxEnrollment?: number | null;
  currentEnrollment?: number | null;
  seatsAvailable?: number | null;
  finalExam?: any;
  createdAt?: string;
}

export interface BannerTermItem {
  termCode: string;
  termName: string;
  academicYear: string;
  semester: string;
  monitorChanges: boolean;
  autoUpdate: boolean;
  updateIntervalDays: number;
  lastSyncAt?: string | null;
  lastCheckAt?: string | null;
  totalSections: number;
  status: 'idle' | 'syncing' | 'error';
  lastError?: string | null;
}

export interface DetectedTermItem {
  termCode: string;
  termName: string;
  academicYear: string;
  semester: string;
  code?: string;
  name?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  academicYear?: string;
  semester?: string;
  term?: string;
  termCode?: string;
  count: number;
  bannerConfig?: BannerTermItem;
}

export type AvailableTerm = {
  academicYear?: string;
  semester?: string;
  term?: string;
  count?: number;
};

export function buildSectionFolders(
  bannerTerms: BannerTermItem[],
  availableTerms: AvailableTerm[]
): FolderItem[] {
  const folders: FolderItem[] = [];
  const bannerCodes = new Set(bannerTerms.map(term => term.termCode));

  for (const term of bannerTerms) {
    folders.push({
      id: term.termCode,
      name: term.termName,
      academicYear: term.academicYear,
      semester: term.semester,
      term: term.termCode,
      termCode: term.termCode,
      count: term.totalSections || 0,
      bannerConfig: term
    });
  }

  for (const term of availableTerms) {
    const id = term.term || `${term.academicYear || ''}-${term.semester || ''}`;
    const name = term.term || (
      term.academicYear && term.semester
        ? `${term.academicYear} - ${term.semester}`
        : term.academicYear || term.semester || 'غير مصنف'
    );

    if (
      (term.term ? bannerCodes.has(term.term) : false) ||
      folders.some(folder => folder.name === name || folder.id === id)
    ) {
      continue;
    }

    folders.push({
      id,
      name,
      academicYear: term.academicYear,
      semester: term.semester,
      term: term.term,
      termCode: term.term,
      count: term.count || 0
    });
  }

  return folders;
}

const FOLDERS_STORAGE_KEY = 'imamu_section_folders';

export function saveSharedFolders(folders: AvailableTerm[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // Local storage is optional.
  }
}

export function loadSharedFolders(): AvailableTerm[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
