import { db } from './src/db/index';
import { majors, subjects, majorCourses } from './src/db/schema';

async function run() {
  try {
    const s = await db.insert(subjects).values({ code: "TEST101", name: "Test" }).returning();
    const inserted = await db.insert(majors).values({ name: "Test Major", pdfUrl: "" }).returning();
    console.log("Inserted major:", inserted[0].id);
    await db.insert(majorCourses).values({ majorId: inserted[0].id, subjectId: s[0].id, optionalGroup: "", optionalGroupReqCount: 1 });
    console.log("Inserted major course successfully");
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
