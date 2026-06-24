import { db } from './src/db/index';
import { majors, subjects, majorCourses } from './src/db/schema';

async function run() {
  try {
    const s = await db.insert(subjects).values({ code: "TEST103", name: "Test3" }).returning();
    await db.insert(majorCourses).values({ majorId: 999999, subjectId: s[0].id, optionalGroup: "", optionalGroupReqCount: 1 });
    console.log("Inserted major course successfully");
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
