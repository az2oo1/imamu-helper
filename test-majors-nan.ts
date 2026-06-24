import { db } from './src/db/index';
import { majors, subjects, majorCourses } from './src/db/schema';

async function run() {
  try {
    const s = await db.insert(subjects).values({ code: "TEST102", name: "Test2" }).returning();
    await db.insert(majorCourses).values({ majorId: parseInt("undefined"), subjectId: s[0].id, optionalGroup: "", optionalGroupReqCount: 1 });
    console.log("Inserted major course successfully");
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
