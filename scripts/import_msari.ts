import { getDb } from '../src/db/index';
import { majors, subjects, majorCourses } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const MSARI_BASE_URL = 'https://ditleqvyorzirjqpnsuo.supabase.co/rest/v1';
const MSARI_API_KEY = 'sb_publishable_BC4h29_ZJnuoj3U51QAcDA_kl3uJLMQ';

const COURSE_NAME_AR: Record<string, string> = {
  CS1111: 'أساسيات الحوسبة وأخلاقياتها',
  PHY1103: 'فيزياء عامة',
  MAT1112: 'تفاضل وتكامل تطبيقي 1',
  ENG1001: 'مهارات اللغة الإنجليزية',
  QUR1001: 'القرآن الكريم',
  COM1001: 'مهارات الاتصال',
  ARB1001: 'مهارات اللغة العربية',
  CS1140: 'مقدمة في برمجة الحاسب',
  CS1100: 'تراكيب محددة 1',
  PHY1104: 'فيزياء تطبيقية',
  MAT1113: 'تفاضل وتكامل تطبيقي 2',
  ENG1050: 'القراءة والكتابة باللغة الإنجليزية',
  RHB1001: 'قيم العمل وأخلاقياته',
  CS1241: 'البرمجة الشيئية',
  CS1220: 'تصميم المنطق الرقمي',
  STA1011: 'مقدمة في الاحتمالات والإحصاء',
  JR1001: 'فقه العبادات والأسرة',
  CS1242: 'تراكيب البيانات',
  CS1201: 'تراكيب محددة 2',
  MAT1227: 'الجبر الخطي',
  BRO1001: 'مهارات الاتصال الإعلامي',
  CS1223: 'عمارة الحاسب',
  CS1350: 'هندسة البرمجيات 1',
  CS1312: 'تصميم وتحليل الخوارزميات',
  HST1002: 'التاريخ الوطني',
  CS1370: 'مبادئ قواعد البيانات',
  CS1322: 'نظم التشغيل',
  CS1351: 'هندسة البرمجيات 2',
  CS1360: 'الذكاء الاصطناعي',
  IDE1001: 'العقيدة',
  CS1352: 'تصميم الأنظمة الذكية',
  CS1330: 'شبكات الحاسب',
  CS1313: 'المترجمات',
  CS1381: 'ندوة التطوير المهني',
  CS1472: 'أمن المعلومات',
  CS1461: 'تعلم الآلة',
  CS1495: 'مشروع التخرج 1',
  CS1462: 'معالجة اللغات الطبيعية',
  CS1465: 'الشبكات العصبية والتعلم العميق',
  CS1447: 'تطوير تطبيقات الألعاب',
  CS1471: 'قواعد بيانات متقدمة',
  CS1474: 'أمن الشبكات',
  CS1496: 'مشروع التخرج 2',
  CS1494: 'التدريب العملي',
  IT1110: 'الدعم التقني',
  IT1111: 'أنظمة تقنية المعلومات',
  ENG1040: 'اللغة الإنجليزية',
  IT1201: 'إدارة مشاريع تقنية المعلومات',
  IT1200: 'هندسة تجربة المستخدم',
  IT1220: 'تصميم وتطبيق قواعد البيانات',
  IT1360: 'نظم تشغيل الحاسبات',
  IT1390: 'أنظمة وتقنيات الويب',
  IT1321: 'إدارة نظم قواعد البيانات',
  IT1340: 'شبكات اتصالات البيانات',
  IT1392: 'ندوة',
  IT1331: 'عمارة وتقنية الأنظمة المتكاملة',
  IT1391: 'تطبيقات الهواتف الذكية',
  IT1322: 'تحليل البيانات الضخمة',
  IT1441: 'انترنت الأشياء',
  IT1410: 'مبادئ الأمن السيبراني',
  IT1492: 'مشروع تخرج 1',
  IT1493: 'مشروع تخرج 2',
  IT1494: 'التدريب التعاوني',
  IS1130: 'هندسة المتطلبات',
  IS1235: 'تحليل وتصميم الأنظمة',
  IS1200: 'الكفاءات الإدارية',
  ACC1250: 'مبادئ المحاسبة والتقارير المالية',
  IS1220: 'مقدمة في قواعد البيانات',
  IS1241: 'مبادئ إدارة المشاريع',
  IS1290: 'اتصالات الأعمال',
  IS1310: 'عمارة المؤسسات',
  IS1321: 'نظم إدارة قواعد البيانات',
  IS1350: 'التقنية المالية: الأساسيات والتطبيقات',
  IS1337: 'تطوير التطبيقات',
  IS1341: 'البنية التحتية لتقنية المعلومات',
  IS1382: 'الاستراتيجية ونماذج الأعمال',
  IS1330: 'أساسيات شبكات البيانات',
  IS1460: 'الأعمال الإلكترونية',
  IS1480: 'مشروع تخرج 1',
  IS1489: 'أمن المعلومات',
  IS1497: 'التدريب التعاوني',
  IS1483: 'مشروع تخرج 2'
};

async function fetchMsari(endpoint: string) {
  const res = await fetch(`${MSARI_BASE_URL}/${endpoint}`, {
    headers: {
      'apikey': MSARI_API_KEY,
      'Authorization': `Bearer ${MSARI_API_KEY}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
  }
  return res.json();
}

export async function importMsariData() {
  console.log('[Import] Starting Msari data import...');
  const db = await getDb();

  // 1. Fetch Msari data
  const [msariMajors, msariCourses, msariPackages, msariNonCore] = await Promise.all([
    fetchMsari('majors?select=*'),
    fetchMsari('courses?select=*'),
    fetchMsari('packages?select=*'),
    fetchMsari('noncore_courses?select=*')
  ]);

  console.log(`[Import] Loaded ${msariMajors.length} majors, ${msariCourses.length} core courses, ${msariPackages.length} packages, ${msariNonCore.length} non-core courses.`);

  // 2. Process Majors
  const majorIdMap = new Map<number, number>(); // Msari Major ID -> Local Major ID

  for (const m of msariMajors) {
    if (m.status !== 'active') continue;
    
    let localMajor = (await db.select().from(majors).where(eq(majors.name, m.name)))[0];
    if (!localMajor) {
      const inserted = await db.insert(majors).values({
        name: m.name
      }).returning();
      localMajor = inserted[0];
      console.log(`[Import] Created major: ${m.name} (ID: ${localMajor.id})`);
    } else {
      console.log(`[Import] Existing major found: ${m.name} (ID: ${localMajor.id})`);
    }
    majorIdMap.set(m.id, localMajor.id);
  }

  // 3. Process Core Courses
  const subjectIdMapByCode = new Map<string, number>(); // Course Code -> Local Subject ID

  for (const c of msariCourses) {
    const code = c.code.trim();
    if (!code || code.startsWith('UNIV-') || code.startsWith('FREE-') || code.startsWith('ELEC-')) {
      continue; // Skip generic placeholders
    }

    const arName = COURSE_NAME_AR[code] || c.name_ar || c.name;
    const displayName = (arName && arName !== c.name) ? `${arName} (${c.name})` : (c.name || arName);
    const level = c.term_hint ? Number(c.term_hint) : null;
    const hours = c.hours ? Number(c.hours) : 3;

    let localSub = (await db.select().from(subjects).where(eq(subjects.code, code)))[0];
    if (!localSub) {
      const inserted = await db.insert(subjects).values({
        code,
        name: displayName,
        creditHours: hours,
        level,
        description: c.prereq ? `المتطلبات السابقة: ${Array.isArray(c.prereq) ? c.prereq.join(', ') : c.prereq}` : null
      }).returning();
      localSub = inserted[0];
      console.log(`[Import] Added subject: ${code} - ${displayName}`);
    } else {
      // Update with fresh data from Msari
      await db.update(subjects).set({
        name: displayName || localSub.name,
        creditHours: hours || localSub.creditHours,
        level: level ?? localSub.level,
        description: c.prereq ? `المتطلبات السابقة: ${Array.isArray(c.prereq) ? c.prereq.join(', ') : c.prereq}` : localSub.description
      }).where(eq(subjects.id, localSub.id));
    }

    subjectIdMapByCode.set(code, localSub.id);

    // Link subject to major
    const localMajorId = majorIdMap.get(c.major_id);
    if (localMajorId) {
      const groupName = level ? `المستوى ${level}` : 'المتطلبات العامة';
      const existingLink = (await db.select().from(majorCourses).where(
        and(eq(majorCourses.majorId, localMajorId), eq(majorCourses.subjectId, localSub.id))
      ))[0];

      if (!existingLink) {
        await db.insert(majorCourses).values({
          majorId: localMajorId,
          subjectId: localSub.id,
          optionalGroup: groupName,
          optionalGroupReqCount: 1
        });
      } else {
        await db.update(majorCourses).set({
          optionalGroup: groupName,
          optionalGroupReqCount: 1
        }).where(eq(majorCourses.id, existingLink.id));
      }
    }
  }

  // 4. Process Non-Core / Elective Courses & Packages
  const packageMap = new Map<string, any>();
  for (const pkg of msariPackages) {
    packageMap.set(pkg.code, pkg);
  }

  for (const nc of msariNonCore) {
    const code = nc.code ? nc.code.trim() : '';
    if (!code) continue;

    const name = nc.name_ar || nc.name || code;
    const hours = nc.hours ? Number(nc.hours) : 3;

    let localSub = (await db.select().from(subjects).where(eq(subjects.code, code)))[0];
    if (!localSub) {
      const inserted = await db.insert(subjects).values({
        code,
        name,
        creditHours: hours,
        level: null,
        description: nc.prereq ? `المتطلبات السابقة: ${nc.prereq}` : null
      }).returning();
      localSub = inserted[0];
    } else {
      await db.update(subjects).set({
        name: name || localSub.name,
        creditHours: hours || localSub.creditHours,
        description: nc.prereq ? `المتطلبات السابقة: ${nc.prereq}` : localSub.description
      }).where(eq(subjects.id, localSub.id));
    }

    subjectIdMapByCode.set(code, localSub.id);

    // Link subject to major via Package name
    const localMajorId = majorIdMap.get(nc.major_id);
    const pkg = packageMap.get(nc.package_code);
    const groupName = pkg ? pkg.name : (nc.subgroup_ar || 'المقررات الاختيارية');
    const reqCount = pkg ? (pkg.required_units || 1) : 1;

    if (localMajorId) {
      const existingLink = (await db.select().from(majorCourses).where(
        and(eq(majorCourses.majorId, localMajorId), eq(majorCourses.subjectId, localSub.id))
      ))[0];

      if (!existingLink) {
        await db.insert(majorCourses).values({
          majorId: localMajorId,
          subjectId: localSub.id,
          optionalGroup: groupName,
          optionalGroupReqCount: reqCount
        });
      } else {
        await db.update(majorCourses).set({
          optionalGroup: groupName,
          optionalGroupReqCount: reqCount
        }).where(eq(majorCourses.id, existingLink.id));
      }
    }
  }

  console.log('[Import] Msari data import completed successfully!');
  return { success: true, majorsCount: majorIdMap.size, subjectsCount: subjectIdMapByCode.size };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && (process.argv[1].includes('import_msari'))) {
  importMsariData()
    .then(res => {
      console.log('[Import Result]', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Import Error]', err);
      process.exit(1);
    });
}
