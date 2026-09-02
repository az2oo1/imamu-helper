import { getDb } from '../src/db/index';
import { events, users } from '../src/db/schema';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/lib/config';
import { eq } from 'drizzle-orm';

const officialEvents = [
  { title: "التحويل بين الكليات والأقسام (عبر الخدمات الذاتية) - الفصل الثاني", date: "2026-12-27", description: "من الأحد 18/07/1448هـ (27/12/2026م) إلى السبت 01/08/1448هـ (09/01/2027م) - الفصل الدراسي الثاني" },
  { title: "إعادة القيد للمنتظمين غير المستجدين (عبر الخدمات الذاتية) - الفصل الثاني", date: "2026-12-20", description: "من الأحد 11/07/1448هـ (20/12/2026م) إلى السبت 08/08/1448هـ (16/01/2027م) - الفصل الدراسي الثاني" },
  { title: "تسجيل المقررات (عبر الخدمات الذاتية) - الفصل الثاني", date: "2026-12-20", description: "من الأحد 11/07/1448هـ (20/12/2026م) إلى السبت 24/07/1448هـ (02/01/2027م) - الفصل الدراسي الثاني" },
  { title: "التسجيل الإلحاقي لمعالجة الحالات المتعثرة - الفصل الثاني", date: "2027-01-14", description: "من الخميس 06/08/1448هـ (14/01/2027م) إلى السبت 08/08/1448هـ (16/01/2027م) - الفصل الدراسي الثاني" },
  { title: "تأجيل القبول (في برامج الدراسات العليا) - الفصل الثاني", date: "2027-01-03", description: "من الأحد 25/07/1448هـ (03/01/2027م) إلى السبت 08/08/1448هـ (16/01/2027م) - الفصل الدراسي الثاني" },
  { title: "بداية الدراسة - الفصل الثاني", date: "2027-01-17", description: "الأحد 09/08/1448هـ (17/01/2027م) - بداية الدراسة للفصل الدراسي الثاني", isSemesterStart: true },
  { title: "الاختبارات البديلة والتكميلية عن الفصل الدراسي الأول", date: "2027-01-17", description: "من الأحد 09/08/1448هـ (17/01/2027م) إلى الخميس 13/08/1448هـ (21/01/2027م)" },
  { title: "التأجيل لبرامج الدبلوم والبكالوريوس والدراسات العليا (عبر الخدمات الذاتية) - الفصل الثاني", date: "2027-01-10", description: "من الأحد 02/08/1448هـ (10/01/2027م) إلى السبت 15/08/1448هـ (23/01/2027م) - الفصل الدراسي الثاني" },
  { title: "الاعتذار عن الفصل والانسحاب من مقرر أو مقررين (الدبلوم والبكالوريوس) - الفصل الثاني", date: "2027-01-24", description: "من الأحد 16/08/1448هـ (24/01/2027م) إلى السبت 16/12/1448هـ (22/05/2027م) - الفصل الدراسي الثاني" },
  { title: "الاعتذار عن الفصل الدراسي في (الدراسات العليا) - الفصل الثاني", date: "2027-01-24", description: "من الأحد 16/08/1448هـ (24/01/2027م) إلى السبت 23/12/1448هـ (29/05/2027م) - الفصل الدراسي الثاني" },
  { title: "إجازة يوم التأسيس", date: "2027-02-21", description: "الأحد والإثنين 14-15/09/1448هـ (21-22/02/2027م) - إجازة يوم التأسيس", isHoliday: true, isNationalDay: true },
  { title: "بداية إجازة عيد الفطر", date: "2027-02-25", description: "نهاية دوام يوم الخميس 18/09/1448هـ (25/02/2027م) - بداية إجازة عيد الفطر المبارك", isHoliday: true, isEid: true },
  { title: "بداية الدراسة بعد إجازة عيد الفطر", date: "2027-03-14", description: "الأحد 06/10/1448هـ (14/03/2027م) - عودة الدراسة بعد إجازة عيد الفطر", isHolidayEnd: true },
  { title: "بداية إجازة عيد الأضحى", date: "2027-05-06", description: "نهاية دوام يوم الخميس 29/11/1448هـ (06/05/2027م) - بداية إجازة عيد الأضحى المبارك", isHoliday: true, isEid: true },
  { title: "بداية الدراسة بعد إجازة عيد الأضحى", date: "2027-05-23", description: "الأحد 17/12/1448هـ (23/05/2027م) - عودة الدراسة بعد إجازة عيد الأضحى", isHolidayEnd: true },
  { title: "بداية الاختبارات النهائية - الفصل الثاني", date: "2027-06-06", description: "الأحد 01/01/1449هـ (06/06/2027م) - بداية الاختبارات النهائية للفصل الدراسي الثاني" },
  { title: "بداية إجازة نهاية العام الدراسي للطلاب والطالبات", date: "2027-06-17", description: "نهاية دوام يوم الخميس 12/01/1449هـ (17/06/2027م) - بداية إجازة نهاية العام الدراسي", isHoliday: true, isSemesterEnd: true },
  { title: "بداية إجازة نهاية العام الدراسي لأعضاء هيئة التدريس والمحاضرين والمعيدين", date: "2027-06-24", description: "نهاية دوام يوم الخميس 19/01/1449هـ (24/06/2027م) - بداية إجازة أعضاء هيئة التدريس", isHoliday: true },
  { title: "التحويل الخارجي من الجامعات الأخرى إلى الجامعة للعام 1449/1450هـ", date: "2027-07-04", description: "من الأحد 29/01/1449هـ (04/07/2027م) إلى السبت 06/02/1449هـ (10/07/2027م) (عبر الموقع الإلكتروني)" },
  { title: "بداية الدراسة وعودة أعضاء هيئة التدريس للعام 1449/1450هـ", date: "2027-08-22", description: "الأحد 20/03/1449هـ (22/08/2027م) - بداية الدراسة وعودة أعضاء هيئة التدريس للعام 1449/1450هـ", isSemesterStart: true }
];

async function main() {
  const db = await getDb();
  console.log('[Admin Manual Insert] Connected to DB.');

  // Find or create admin user
  let adminList = await db.select().from(users).where(eq(users.isAdmin, true));
  let admin = adminList[0];
  if (!admin) {
    const [newAdmin] = await db.insert(users).values({
      uid: 'admin-manual-id',
      email: 'admin@imamu.edu.sa',
      userName: 'admin',
      isAdmin: true
    }).returning();
    admin = newAdmin;
  }

  const token = jwt.sign({ uid: admin.uid, email: admin.email, isAdmin: true, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`[Admin Manual Insert] Logged in as Admin (${admin.email}). Token generated.`);

  let inserted = 0;
  let updated = 0;
  for (const ev of officialEvents) {
    const existing = await db.select().from(events).where(eq(events.title, ev.title));
    if (existing.length === 0) {
      await db.insert(events).values({
        title: ev.title,
        date: ev.date,
        description: ev.description,
        isHoliday: !!ev.isHoliday,
        isHolidayEnd: !!ev.isHolidayEnd,
        isSemesterStart: !!ev.isSemesterStart,
        isSemesterEnd: !!ev.isSemesterEnd,
        isEid: !!ev.isEid,
        isNationalDay: !!ev.isNationalDay
      });
      inserted++;
    } else {
      await db.update(events).set({
        date: ev.date,
        description: ev.description,
        isHoliday: !!ev.isHoliday,
        isHolidayEnd: !!ev.isHolidayEnd,
        isSemesterStart: !!ev.isSemesterStart,
        isSemesterEnd: !!ev.isSemesterEnd,
        isEid: !!ev.isEid,
        isNationalDay: !!ev.isNationalDay
      }).where(eq(events.id, existing[0].id));
      updated++;
    }
  }

  console.log(`[Admin Manual Insert] Complete! Inserted: ${inserted}, Updated: ${updated}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Admin Manual Insert Error]', err);
  process.exit(1);
});
