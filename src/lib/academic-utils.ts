export function extractPrereqCodes(description?: string | null): string[] {
  if (!description) return [];
  const match = description.match(/(?:المتطلبات السابقة:|prereq:?)\s*([A-Z0-9,\s\u0600-\u06FF]+)/i);
  if (!match) return [];
  const codes = match[1].match(/[A-Z]{2,4}\s*\d{3,4}|[\u0600-\u06FF]{2,4}\s*\d{3,4}/g);
  return codes ? Array.from(new Set(codes.map(c => c.trim()))) : [];
}

export function getSubjectPrereqs(s: any): string[] {
  if (s.prereq) {
    return s.prereq.split(/[,|،+/]+/).map((c: string) => c.trim()).filter(Boolean);
  }
  return extractPrereqCodes(s.description);
}

export function isCourseCompleted(completedCourses: string[], targetCode: string): boolean {
  if (!targetCode || !completedCourses) return false;
  const targetNorm = targetCode.replace(/\s+/g, '').toLowerCase();
  return completedCourses.some(c => c && c.replace(/\s+/g, '').toLowerCase() === targetNorm);
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

  groups.forEach(([groupName, groupSubjects]) => {
    const totalInGroup = groupSubjects.length;
    const declaredReqCount = Number(groupSubjects[0]?.reqCount) || 0;
    const isLevelGroup = groupName.startsWith('المستوى');
    const reqCount = (declaredReqCount > 0 && !isLevelGroup) ? declaredReqCount : totalInGroup;
    const selectedInGroup = groupSubjects.filter(s => isCourseCompleted(completedCourses, s.code)).length;
    
    totalReq += Number(reqCount);
    totalFinishedInReq += Math.min(selectedInGroup, Number(reqCount));
  });

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
    allGroupNames
  };
}
