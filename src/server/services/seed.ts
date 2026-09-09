import { tutorial_sections, tutorials, newbie_links, news_sources, news, course_resources, subjects, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { downloadAndUploadToStorage } from '../../lib/storage';

export async function syncExternalImagesToStorage(db: any) {
  try {
    console.log('[DB] Checking for external images/avatars/logos to save into Garage S3 Object Storage...');

    // 1. news_sources profilePicUrl
    const sources = await db.select().from(news_sources);
    for (const s of sources) {
      if (s.profilePicUrl && (s.profilePicUrl.startsWith('http://') || s.profilePicUrl.startsWith('https://'))) {
        const storedUrl = await downloadAndUploadToStorage(s.profilePicUrl, `news_sources/${s.id}/avatar`, 'news');
        if (storedUrl && storedUrl !== s.profilePicUrl) {
          await db.update(news_sources).set({ profilePicUrl: storedUrl }).where(eq(news_sources.id, s.id));
          console.log(`[Storage Sync] Saved news_source logo @${s.handle} to Garage S3: ${storedUrl}`);
        }
      }
    }

    // 2. news authorAvatar and imageUrl
    const newsItems = await db.select().from(news);
    for (const n of newsItems) {
      const updates: any = {};
      if (n.authorAvatar && (n.authorAvatar.startsWith('http://') || n.authorAvatar.startsWith('https://'))) {
        const storedAvatar = await downloadAndUploadToStorage(n.authorAvatar, `news/${n.id}/author`, 'news');
        if (storedAvatar && storedAvatar !== n.authorAvatar) updates.authorAvatar = storedAvatar;
      }
      if (n.imageUrl && (n.imageUrl.startsWith('http://') || n.imageUrl.startsWith('https://'))) {
        const storedImg = await downloadAndUploadToStorage(n.imageUrl, `news/${n.id}/image`, 'news');
        if (storedImg && storedImg !== n.imageUrl) updates.imageUrl = storedImg;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(news).set(updates).where(eq(news.id, n.id));
        console.log(`[Storage Sync] Saved news item #${n.id} media to Garage S3`, updates);
      }
    }

    // 3. course_resources avatarUrl and bannerUrl
    const resources = await db.select().from(course_resources);
    for (const r of resources) {
      const updates: any = {};
      if (r.avatarUrl && (r.avatarUrl.startsWith('http://') || r.avatarUrl.startsWith('https://') || r.avatarUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(r.avatarUrl, `resources/${r.id}/avatar`, 'resources');
        if (stored && stored !== r.avatarUrl) updates.avatarUrl = stored;
      }
      if (r.bannerUrl && (r.bannerUrl.startsWith('http://') || r.bannerUrl.startsWith('https://') || r.bannerUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(r.bannerUrl, `resources/${r.id}/banner`, 'resources');
        if (stored && stored !== r.bannerUrl) updates.bannerUrl = stored;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(course_resources).set(updates).where(eq(course_resources.id, r.id));
        console.log(`[Storage Sync] Saved course_resource #${r.id} avatar to Garage S3`, updates);
      }
    }

    // 4. subjects avatarUrl and bannerUrl
    const subjs = await db.select().from(subjects);
    for (const sub of subjs) {
      const updates: any = {};
      if (sub.avatarUrl && (sub.avatarUrl.startsWith('http://') || sub.avatarUrl.startsWith('https://') || sub.avatarUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(sub.avatarUrl, `subjects/${sub.id}/avatar`, 'resources');
        if (stored && stored !== sub.avatarUrl) updates.avatarUrl = stored;
      }
      if (sub.bannerUrl && (sub.bannerUrl.startsWith('http://') || sub.bannerUrl.startsWith('https://') || sub.bannerUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(sub.bannerUrl, `subjects/${sub.id}/banner`, 'resources');
        if (stored && stored !== sub.bannerUrl) updates.bannerUrl = stored;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(subjects).set(updates).where(eq(subjects.id, sub.id));
        console.log(`[Storage Sync] Saved subject #${sub.id} avatar to Garage S3`, updates);
      }
    }

    // 5. users profilePicUrl (including base64 data URLs)
    const userRecs = await db.select().from(users);
    for (const u of userRecs) {
      if (u.profilePicUrl && (u.profilePicUrl.startsWith('http://') || u.profilePicUrl.startsWith('https://') || u.profilePicUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(u.profilePicUrl, `users/${u.id}/pfp`, 'pfp');
        if (stored && stored !== u.profilePicUrl) {
          await db.update(users).set({ profilePicUrl: stored }).where(eq(users.id, u.id));
          console.log(`[Storage Sync] Saved user #${u.id} profile pic to Garage S3: ${stored}`);
        }
      }
    }
  } catch (err: any) {
    console.error('[Storage Sync] Error syncing external images to storage:', err.message || err);
  }
}

export async function seedDefaults(db: any) {
  try {
    const existingSections = await db.select().from(tutorial_sections);
    if (existingSections.length === 0) {
      console.log('[DB] Seeding default tutorial sections and tutorials...');
      const [secAcademic] = await db.insert(tutorial_sections).values({
        title: 'الحياة الأكاديمية والتسجيل',
        icon: 'GraduationCap',
        color: 'blue'
      }).returning();

      const [secServices] = await db.insert(tutorial_sections).values({
        title: 'الخدمات والمكافآت',
        icon: 'CreditCard',
        color: 'emerald'
      }).returning();

      const [secPlatforms] = await db.insert(tutorial_sections).values({
        title: 'المنصات والتقنية الجامعية',
        icon: 'Laptop',
        color: 'indigo'
      }).returning();

      const [secRegulations] = await db.insert(tutorial_sections).values({
        title: 'الأنظمة واللوائح الجامعية',
        icon: 'Scale',
        color: 'amber'
      }).returning();

      await db.insert(tutorials).values([
        {
          sectionId: secAcademic.id,
          title: "كيف تسجل المواد في الخدمة الذاتية؟",
          description: "خطوات تسجيل وحذف وإضافة المقررات عبر نظام الخدمة الذاتية (بانر Banner)، وحل مشاكل التعارض وإدخال الأرقام المرجعية.",
          text: "[{\"type\":\"text\",\"content\":\"تسجيل المقررات في جامعة الإمام يتم إلكترونياً بالكامل عبر **نظام الخدمة الذاتية (Banner)**. يفتح التسجيل على فترات محددة حسب دفعتك وسنتك الدراسية وفق ما تعلنه عمادة القبول والتسجيل في [التقويم الأكاديمي](https://units.imamu.edu.sa/deanships/admission/Pages/calendar.aspx).\"},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"⚠️ تنبيهات ذهبية قبل موعد التسجيل:\",\"content\":\"1. تأكد من خلو سجلك من أي إيقافات أكاديمية أو مالية عبر صفحة إيقافات التسجيل في الخدمة الذاتية.\\n2. جهّز أرقام الشعب المرجعية (CRN) للمواد التي ترغب بتسجيلها مسبقاً من ملفات الأرقام المرجعية أو من منصة [ترتيبة](https://trtebh.com).\\n3. الطلاب المستجدون (أول فصل دراسي) ينزل جدولهم جاهزاً وتلقائياً من الكلية ولا يحتاجون لتسجيل مواد.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول إلى [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) وكتابة الرقم الجامعي وكلمة المرور.\",\"الضغط على تبويب **التسجيل والجدول الدراسي** من القائمة الرئيسية.\",\"اختيار **التسجيل للمقررات الدراسية** ثم تحديد الفصل الدراسي المستهدف والضغط على متابعة.\",\"اختر خيار **إدخال الأرقام المرجعية (Enter CRNs)** واكتب أرقام المقررات التي نسقتها مسبقاً ثم اضغط **إضافة إلى القائمة**.\",\"اضغط على زر **تنفيذ التغييرات (Submit)** بالأسفل، وتأكد من تحول حالة المقررات إلى **مسجل عبر الويب (Web Registered)** باللون الأخضر.\"]},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"💡 واجهت مشكلة في الشعبة أو تعارض؟\",\"content\":\"إذا ظهر لك خطأ \\\"شعبة مغلقة\\\" أو \\\"تعارض في الوقت\\\"، يمكنك البحث عن شعبة بديلة برقم CRN مختلف، أو مراجعة المرشد الأكاديمي بكليتك أو رفع طلب عبر [بوابة تواصل](https://tawasol.imamu.edu.sa).\"},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة الخدمة الذاتية (Banner)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"منصة ترتيبة لتنسيق الجدول\",\"url\":\"https://trtebh.com\"},{\"label\":\"التقويم الأكاديمي ومواعيد الدفعات\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/Pages/calendar.aspx\"},{\"label\":\"بوابة تواصل لحل مشاكل التسجيل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"الدخول إلى [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) وكتابة الرقم الجامعي وكلمة المرور.\",\"الضغط على تبويب **التسجيل والجدول الدراسي** من القائمة الرئيسية.\",\"اختيار **التسجيل للمقررات الدراسية** ثم تحديد الفصل الدراسي المستهدف والضغط على متابعة.\",\"اختر خيار **إدخال الأرقام المرجعية (Enter CRNs)** واكتب أرقام المقررات التي نسقتها مسبقاً ثم اضغط **إضافة إلى القائمة**.\",\"اضغط على زر **تنفيذ التغييرات (Submit)** بالأسفل، وتأكد من تحول حالة المقررات إلى **مسجل عبر الويب (Web Registered)** باللون الأخضر.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/h6gwhLlwSC8zCHA7ArdIkailqvbwSTjtetXgDEyRjvId5TPbgPg8eGkksKNBN8dbOGIbUh9v1VLPmIFdrWB0oBc1Sxo_-kSdiSA9ThveKxKlEqD2zYaFiSXU98x5fY5Ca7XKDY39HSx7RS4QQIRGKGs4zCo5yNLR2Eu0p-6Q8b-MknkVkkaEGNGYh5YJAmKNrp7QT_72DklylZelxQ_DeB0yXNPHzn-u5zvOoavb3lKjUv5o2MDtmG0glJGe0WDbAPTTFJTOh9lbhOyE6bzGR0oowijLy3MQugoaieoK9yrTeUYqrP-YfWK2vksnRnJhzFf9tGgDuZwBY02R5cz1fw.jpg",
          linkUrl: "https://bstss.imamu.edu.sa/StudentSelfService",
          linkTitle: "بوابة الخدمة الذاتية (Banner)"
        },
        {
          sectionId: secAcademic.id,
          title: "كيف أحسب معدلي التراكمي؟",
          description: "شرح طريقة احتساب المعدل الفصلي والتراكمي من 5.00، مع سلم التقديرات الجامعية وحاسبة المعدل الفورية.",
          text: "[{\"type\":\"text\",\"content\":\"يُحسب المعدل في جامعة الإمام بنظام **النقاط من 5.00**. يتم ضرب عدد ساعات كل مقرر في وزن التقدير الذي حصلت عليه للحصول على مجموع النقاط، ثم قسمة إجمالي النقاط على إجمالي الساعات المسجلة.\\n\\nيمكنك استخدام [حاسبة المعدل التراكمي](/tools) بموقعنا لحساب معدلك وتوقع الدرجات المطلوبة بضغطة زر!\"},{\"type\":\"table\",\"tableHeaders\":[\"التقدير\",\"الرمز\",\"الدرجة المئوية\",\"النقاط (من 5.00)\",\"الأثر الأكاديمي\"],\"tableRows\":[[\"ممتاز مرتفع\",\"A+\",\"95 - 100\",\"5.00\",\"يرفع المعدل بأقصى طاقة\"],[\"ممتاز\",\"A\",\"90 - أقل من 95\",\"4.75\",\"ممتاز جداً لمرتبة الشرف الأولى\"],[\"جيد جداً مرتفع\",\"B+\",\"85 - أقل من 90\",\"4.50\",\"يضمن مرتبة الشرف الثانية\"],[\"جيد جداً\",\"B\",\"80 - أقل من 85\",\"4.00\",\"جيد جداً ومقبول للدراسات العليا\"],[\"جيد مرتفع\",\"C+\",\"75 - أقل من 80\",\"3.50\",\"معدل آمن\"],[\"جيد\",\"C\",\"70 - أقل من 75\",\"3.00\",\"الحد الأدنى للسلامة في التخصص\"],[\"مقبول مرتفع\",\"D+\",\"65 - أقل من 70\",\"2.50\",\"انتبه: قد يخفض المعدل التراكمي\"],[\"مقبول\",\"D\",\"60 - أقل من 65\",\"2.00\",\"الحد الأدنى للنجاح في المقرر\"],[\"راسب\",\"F\",\"أقل من 60\",\"0.00\",\"صفر نقاط + إعادة المقرر إجبارية\"],[\"حرمان\",\"DN\",\"غياب تجاوز 25%\",\"0.00\",\"يُعامل معاملة الرسوب (F)\"]]},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"💡 معادلة حساب المعدل الفصلي:\",\"content\":\"**المعدل الفصلي = مجموع (نقاط المادة × عدد ساعاتها) ÷ إجمالي الساعات المسجلة بالفصل**.\\nمثال: إذا أخذت مادة 3 ساعات وجبت فيها A+ (نقاط 5)، ومادة ساعتين وجبت فيها B (نقاط 4)، يكون مجموع نقاطك = (3×5) + (2×4) = 23 نقطة. تقسم 23 على 5 ساعات = 4.60 من 5.00.\"},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"الانتقال لحاسبة المعدل التفاعلية\",\"url\":\"/tools\"},{\"label\":\"استعراض سجلك الأكاديمي (بانر)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"لائحة الدراسة والاختبارات المعتمدة\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/files/study_regulation.pdf\"}]}]",
          steps: "[]",
          imageUrl: "https://cdn4.telesco.pe/file/uw0Zjm4XfPGzlIHsPzm267KOaFIQxkcAzn2GmC9B1OEPYZTYaEVJ3ubnOiwbejdMSSLNNz7PZ65nUYpl_5OKJcWhnZrTz7RKh1MxayVyBqwtB5nTXFyYE5_vE7kXtuUq2WCT189g3fgOlehGtqSTwf7f7taqvH6vL70wMUw0BWD7wbMcSEPhMWymaM3xYnS_2OPH_q9S1ZnXxC2ak_8AuIm9dXrVbAzRwbvkyREmOZsKlLU1xbLBpyzL5GzxT525sGYIuyWanMxszQruytGE4JRBhmXsljKVS5VMUmN9LMa-hLg880tXT728fFqeU_vkecVzIVOj4K1_qvNsNTn33g.jpg",
          linkUrl: "/tools",
          linkTitle: "الانتقال لحاسبة المعدل التفاعلية"
        },
        {
          sectionId: secAcademic.id,
          title: "كيف أصل لمصادر ومجموعات المواد؟",
          description: "دليل الوصول لمذكرات المواد، التجميعات السابقة، قنوات التيليجرام للكلية، وبنك الموارد الأكاديمية.",
          text: "[{\"type\":\"text\",\"content\":\"للتفوق في دراستك بجامعة الإمام، يُعتمد بشكل أساسي على السلايدات الرسمية، ملخصات الطلاب المتميزة، وتجميعات الاختبارات السابقة (الميد والفاينل).\\n\\nوفرنا لك في المنصة قسماً متكاملاً يجمع المواد حسب كليتك وقسمك في [بنك المصادر الأكاديمية](/resources).\"},{\"type\":\"steps\",\"stepsItems\":[\"توجه إلى صفحة [بنك المصادر الأكاديمية](/resources) في المنصة.\",\"اختر كليتك (مثل كلية علوم الحاسب، كلية الشريعة، كلية إدارة الأعمال، كلية العلوم، إلخ).\",\"حدد المقرر المطلوب لتجد السلايدات، الملخصات، وتجميعات السنوات الماضية مرتبة ومفهرسة.\",\"انضم إلى قناة وتجمع تيليجرام الرسمي للجامعة [t.me/imamu](https://t.me/imamu) للاستفادة من قنوات المواد والجروبات المتخصصة لكل شعبة.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"تصفح بنك المصادر الأكاديمية\",\"url\":\"/resources\"},{\"label\":\"قناة جامعة الإمام الرسمية بالتليجرام\",\"url\":\"https://t.me/imamu\"},{\"label\":\"المكتبة الرقمية السعودية (SDL)\",\"url\":\"https://sdl.edu.sa\"}]}]",
          steps: "[\"توجه إلى صفحة [بنك المصادر الأكاديمية](/resources) في المنصة.\",\"اختر كليتك (مثل كلية علوم الحاسب، كلية الشريعة، كلية إدارة الأعمال، كلية العلوم، إلخ).\",\"حدد المقرر المطلوب لتجد السلايدات، الملخصات، وتجميعات السنوات الماضية مرتبة ومفهرسة.\",\"انضم إلى قناة وتجمع تيليجرام الرسمي للجامعة [t.me/imamu](https://t.me/imamu) للاستفادة من قنوات المواد والجروبات المتخصصة لكل شعبة.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "/resources",
          linkTitle: "تصفح بنك المصادر الأكاديمية"
        },
        {
          sectionId: secAcademic.id,
          title: "كيف أحول من تخصص إلى آخر؟",
          description: "شروط التحويل الداخلي بين كليات وأقسام الجامعة، مواعيد فتح البوابة، وكيفية تقديم الطلب ومتابعته.",
          text: "[{\"type\":\"text\",\"content\":\"تتيح جامعة الإمام لطلابها إمكانية التحويل الداخلي بين الأقسام في نفس الكلية، أو التحويل بين الكليات المختلفة (مثل التحويل لكلية إدارة الأعمال أو كلية الحاسب أو الشريعة). يفتح التحويل بنهاية كل فصل دراسي وفق تقويم القبول والتسجيل.\"},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"📋 أبرز شروط التحويل الداخلي المعتمدة:\",\"content\":\"1. ألا يقل المعدل التراكمي عن الحد الأدنى الذي تحدده الكلية المستهدفة (غالباً 3.75 - 4.50 للكليات التنافسية).\\n2. إنهاء عدد ساعات معينة بالكلية الحالية (عادة ما لا يقل عن 24 إلى 30 ساعة معتمدة).\\n3. ألا يكون الطالب مفصولاً أكاديمياً أو تجاوز نصف المدة النظامية للتخرج.\\n4. موافقة الكليتين وتوفر مقاعد شاغرة بالقسم المطلوب.\"},{\"type\":\"steps\",\"stepsItems\":[\"متابعة إعلان مواعيد التحويل على موقع عمادة القبول والتسجيل أو حساب [t.me/imamu](https://t.me/imamu).\",\"الدخول على [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) خلال فترة استقبال الطلبات.\",\"اختيار **طلب التحويل الداخلي (تغيير التخصص)** من قائمة طلبات الطلاب.\",\"تحديد الرغبات بالترتيب حسب الأولوية والتأكد من توافق شروط الرغبة الأولى مع معدلك.\",\"حفظ الطلب ومتابعة حالته عبر نفس الصفحة حتى إعلان نتائج الفرز النهائي.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة الخدمة الذاتية (تقديم التحويل)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"شروط وضوابط التحويل بعمادة القبول\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/Pages/default.aspx\"},{\"label\":\"استفسارات التحويل عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"متابعة إعلان مواعيد التحويل على موقع عمادة القبول والتسجيل أو حساب [t.me/imamu](https://t.me/imamu).\",\"الدخول على [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) خلال فترة استقبال الطلبات.\",\"اختيار **طلب التحويل الداخلي (تغيير التخصص)** من قائمة طلبات الطلاب.\",\"تحديد الرغبات بالترتيب حسب الأولوية والتأكد من توافق شروط الرغبة الأولى مع معدلك.\",\"حفظ الطلب ومتابعة حالته عبر نفس الصفحة حتى إعلان نتائج الفرز النهائي.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/b6gtBkZsjDKKQz3Y6zgJwVKM-ZjPOrSz_uRRRJgj-zD0Wywhs70uHXVvQPfDNrBxtj-JyHAQzD-RnLDXXI28keQTekOc90ADwZQ6kMTdCwPH_8eyI43epxxKSF8mSyl8tUUZxUtAzYGA6GHOVxCWg7hwN806dlF-52_B8znX2j0zVnXuoT5yBqxSEUTojCpmW2NHXkxYqhGVeyyfCwtFSvleQ_6A8Hwq_mtwQT5qoMAXoblnGm6Ypl9HTU9hy4L7WWk9bNGNFSJ6hd6CzvM9aScULpXcxBPyDgnMDjDmpc2zhtQRm274Zt98QZCxPWWXR3tHU16QrSLfpsaOYA3ykA.jpg",
          linkUrl: "https://bstss.imamu.edu.sa/StudentSelfService",
          linkTitle: "بوابة الخدمة الذاتية (تقديم التحويل)"
        },
        {
          sectionId: secAcademic.id,
          title: "شرح آلية المتطلبات الجامعية والمقررات الحرة وطريقة إضافتها",
          description: "شرح متطلبات الجامعة العامة (سلم، عرب، قرء، لغة إنجليزية) والمقررات الحرة وكيفية العثور على شعبها المتاحة.",
          text: "[{\"type\":\"text\",\"content\":\"المتطلبات الجامعية هي مقررات عامة تشترك فيها أغلب كليات الجامعة (مثل مقررات الثقافة الإسلامية سلم، اللغة العربية عرب، التحرير العربي، القرآن الكريم)، وتعتبر فرصة ممتازة للطلاب لرفع معدلهم التراكمي بشرط اختيار دكاترة متميزين ومواعيد مناسبة.\"},{\"type\":\"steps\",\"stepsItems\":[\"الاطلاع على خطتك الدراسية في الخدمة الذاتية لمعرفة المواد العامة والمقررات الحرة المطلوبة منك.\",\"تحميل ملف **الأرقام المرجعية للمتطلبات العامة** المنشور على [بوابة عمادة القبول والتسجيل](https://units.imamu.edu.sa/deanships/admission/announcements/Pages/REG144710.aspx).\",\"استخدام منصة [قيم](https://qeeem.com) للاطلاع على تقييمات الطلاب لدكاترة المقرر وأسلوبهم في الشرح والاختبارات.\",\"إضافة الشعبة عبر إدخال رقم الـ CRN مباشرة في [الخدمة الذاتية](https://bstss.imamu.edu.sa/StudentSelfService).\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"ملفات الأرقام المرجعية المعتمدة\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/announcements/Pages/REG144710.aspx\"},{\"label\":\"منصة قيّم لتقييم الدكاترة\",\"url\":\"https://qeeem.com\"},{\"label\":\"تسجيل المقررات بالخدمة الذاتية\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"}]}]",
          steps: "[\"الاطلاع على خطتك الدراسية في الخدمة الذاتية لمعرفة المواد العامة والمقررات الحرة المطلوبة منك.\",\"تحميل ملف **الأرقام المرجعية للمتطلبات العامة** المنشور على [بوابة عمادة القبول والتسجيل](https://units.imamu.edu.sa/deanships/admission/announcements/Pages/REG144710.aspx).\",\"استخدام منصة [قيم](https://qeeem.com) للاطلاع على تقييمات الطلاب لدكاترة المقرر وأسلوبهم في الشرح والاختبارات.\",\"إضافة الشعبة عبر إدخال رقم الـ CRN مباشرة في [الخدمة الذاتية](https://bstss.imamu.edu.sa/StudentSelfService).\"]",
          imageUrl: "https://cdn4.telesco.pe/file/XwHayajI-FO_yl8ZCEyfsGGmIyiJeyX6pL4oj-4zxa2QaX-g51BMN--ceOb-GavRNt_jwBKeMvPP1Uy8gt7ZGdsfcXx1s2Nty6HFKoa33xVU67-RiMxOqXjv6byG-n13_FBMhzQBp6_bI1jtkUoZVXNveKWo-ZKNJbFUFtVQCehZeOXEcXBHq9TH192935-_6Ce-Ok9y3geFfNNJIkrJO_6Czh4prCy0oDHkFnhK94v4lSQ1Ts_ePm1PEGZVp6VxV7k1UgSW8FhCpaAdXxwiFciOKMR2pktW0tRyNiQegytBNxhwJj7-7l8gRXqFtCcBJsWQ6lb54KvhHIUXrYxQUw.jpg",
          linkUrl: "https://units.imamu.edu.sa/deanships/admission/announcements/Pages/REG144710.aspx",
          linkTitle: "ملفات الأرقام المرجعية المعتمدة"
        },
        {
          sectionId: secAcademic.id,
          title: "طريقة استخدام الأرقام المرجعية (CRN) ومنصة \"ترتيبة\" لتنسيق الجدول",
          description: "كيف تستخدم رقم الشعبة المرجعي (CRN) وتستعين بأداة ترتيبة لبناء جدول دراسي مثالي خالٍ من التعارضات والبريكات الطويلة.",
          text: "[{\"type\":\"text\",\"content\":\"رقم الـ **CRN (Course Reference Number)** هو رقم فريد مكوّن من 4 أو 5 أرقام يمثل شعبة معينة لمقرر دراسي، يحدد مدرس الشعبة ووقتها وقاعتها بدقة.\\n\\nبدلاً من كتابة اسم المادة والبحث العشوائي، يكفي إدخال هذا الرقم في بانر للتسجيل الفوري.\"},{\"type\":\"steps\",\"stepsItems\":[\"افتح منصة [ترتيبة للجداول الدراسية](https://trtebh.com) واختر جامعة الإمام محمد بن سعود الإسلامية.\",\"ابحث عن المقررات التي تريد تنزيلها وأضف الشعب المناسبة لك مع الدكاترة المفضلين.\",\"ستقوم المنصة بكشف التعارضات بين أوقات المحاضرات وعرض جدولك الأسبوعي بشكل بصري واضح.\",\"انسخ قائمة أرقام الـ CRN الجاهزة من ترتيبة.\",\"ادخل على [الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) وقت فتح دفعتك والصق الأرقام في خانات CRN واضغط تنفيذ!\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"منصة ترتيبة لبناء الجداول\",\"url\":\"https://trtebh.com\"},{\"label\":\"منصة قيّم لآراء الطلاب بالدكاترة\",\"url\":\"https://qeeem.com\"},{\"label\":\"ملفات الأرقام المرجعية الرسمية\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/announcements/Pages/REG144710.aspx\"},{\"label\":\"بوابة تسجيل المقررات (بانر)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"}]}]",
          steps: "[\"افتح منصة [ترتيبة للجداول الدراسية](https://trtebh.com) واختر جامعة الإمام محمد بن سعود الإسلامية.\",\"ابحث عن المقررات التي تريد تنزيلها وأضف الشعب المناسبة لك مع الدكاترة المفضلين.\",\"ستقوم المنصة بكشف التعارضات بين أوقات المحاضرات وعرض جدولك الأسبوعي بشكل بصري واضح.\",\"انسخ قائمة أرقام الـ CRN الجاهزة من ترتيبة.\",\"ادخل على [الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService) وقت فتح دفعتك والصق الأرقام في خانات CRN واضغط تنفيذ!\"]",
          imageUrl: "https://cdn4.telesco.pe/file/RydkT7H1TEpj_RTYli8t-DdNZ9YrSTr9neNvFvjHRsBDEF413ypL0Dsa2LDwBYl7GmoY0tcfHAqeO1lB0cO53G3kSGhxxxVt-tDnvdEDAtD4YIvMBYmWAujeqWt20EMtM_oDuFXoLCapGitZduZAjKwlh1UgWIauQpp1Tn_EWd-v0PuwsEinq6RkuAcejWZC1dSQlE5VnkRrsqKK9sPqnoQqE9Hzw99aUEUQ9ATnBwX0qJoLspaq5LSyF5m1JtP9wQ4ojXH8oci5E1SXcNAimi6VBWzJtJT70h2R0EqFLwx3fxsdw36Rp-hBQLJ54l8frctUfUt3NhsJFKv6xUPPXQ.jpg",
          linkUrl: "https://trtebh.com",
          linkTitle: "منصة ترتيبة لبناء الجداول"
        },
        {
          sectionId: secServices.id,
          title: "كيف أتتبع موعد نزول المكافأة؟",
          description: "تفاصيل موعد إيداع المكافأة الشهرية، قيمتها حسب التخصص، شروط استحقاقها، وأسباب انقطاعها.",
          text: "[{\"type\":\"text\",\"content\":\"تُصرف المكافأة الشهرية لجميع الطلاب السعوديين المنتظمين والمبتعثين وفق الموعد المعتمد رسمياً في **يوم 27 من كل شهر ميلادي**. إذا وافق يوم 27 يوم جمعة يُقدّم الصرف للخميس، وإذا وافق يوم سبت يُؤخر للأحد.\"},{\"type\":\"table\",\"tableHeaders\":[\"التخصص / الكلية\",\"المكافأة الاسمية\",\"خصم صندوق الطلاب\",\"الصافي المودع بالحساب\"],\"tableRows\":[[\"التخصصات العلمية والحاسوبية والصحية\",\"1000 ريال\",\"10 ريالات\",\"990 ريال شهرياً\"],[\"التخصصات النظرية والإنسانية والشرعية\",\"850 ريال\",\"10 ريالات\",\"840 ريال شهرياً\"],[\"بدل ذوي الإعاقة (إضافي)\",\"حسب الحالة (حركي/بصري)\",\"-\",\"تصل إلى 1500 ريال إضافية\"]]},{\"type\":\"callout\",\"variant\":\"danger\",\"title\":\"⚠️ حالات إيقاف أو انقطاع المكافأة الجامعية:\",\"content\":\"1. تجاوز المدة النظامية للبرنامج (4 سنوات أو 5 سنوات حسب التخصص).\\n2. الاعتذار عن الفصل الدراسي أو تأجيل الدراسة (لا تصرف خلال فترة الانقطاع).\\n3. الانخفاض الحاد في المعدل التراكمي لبعض الكليات أو فئات المنح.\\n4. عدم تحديث وتفعيل الحساب البنكي (الآيبان) في نظام الخدمات الذاتية.\"},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"عداد المكافأة التفاعلي بالمنصة\",\"url\":\"/\"},{\"label\":\"بوابة الخدمات الذاتية (IMS) للتحقق من الصرف\",\"url\":\"https://ims.imamu.edu.sa\"},{\"label\":\"الاستفسار عن المكافآت عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "/",
          linkTitle: "عداد المكافأة التفاعلي بالمنصة"
        },
        {
          sectionId: secServices.id,
          title: "كيف أستخرج بطاقتي الجامعية والمصرفية؟",
          description: "خطوات رفع الصورة الرسمية عبر الخدمة الذاتية واستلام البطاقة الجامعية وبطاقة الصراف للمكافآت.",
          text: "[{\"type\":\"text\",\"content\":\"البطاقة الجامعية هي هويتك الرسمية داخل الحرم الجامعي والمكتبة والمرافق الرياضية، كما تُستخدم للتحقق أثناء دخول لجان الاختبارات النهائية.\\n\\nتُربط مكافأتك بحساب بنكي رسمي تصدره الجامعة بالتعاون مع البنك المعتمد (مصرف الراجحي غالباً) أو بربط آيبان حسابك الشخصي.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول على [بوابة الخدمة الذاتية (بانر)](https://bstss.imamu.edu.sa/StudentSelfService) والتوجه لخدمة **رفع الصورة الشخصية**.\",\"التأكد من مطابقة الصورة للشروط (خلفية بيضاء، ملامح واضحة، بدون فلاتر، وبالزي الرسمي).\",\"بعد قبول الصورة واعتمادها، ستصلك رسالة نصية SMS بموعد ومكان استلام البطاقة بالمدينة الجامعية.\",\"التوجه لمقر عمادة شؤون الطلاب (مبنى إدارة الجامعة) مع إحضار أصل الهوية الوطنية لاستلام البطاقة وتفعيلها.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة الخدمة الذاتية (رفع الصورة)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"عمادة شؤون الطلاب - شؤون المكافآت\",\"url\":\"https://units.imamu.edu.sa/deanships/affairs/Pages/default.aspx\"},{\"label\":\"تطبيق مصرف الراجحي\",\"url\":\"https://www.alrajhibank.com.sa\"}]}]",
          steps: "[\"الدخول على [بوابة الخدمة الذاتية (بانر)](https://bstss.imamu.edu.sa/StudentSelfService) والتوجه لخدمة **رفع الصورة الشخصية**.\",\"التأكد من مطابقة الصورة للشروط (خلفية بيضاء، ملامح واضحة، بدون فلاتر، وبالزي الرسمي).\",\"بعد قبول الصورة واعتمادها، ستصلك رسالة نصية SMS بموعد ومكان استلام البطاقة بالمدينة الجامعية.\",\"التوجه لمقر عمادة شؤون الطلاب (مبنى إدارة الجامعة) مع إحضار أصل الهوية الوطنية لاستلام البطاقة وتفعيلها.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/XiN6KKcA0ID17oariYuA0kfKBjrn9Xx-EfrnkU7fe8IhNd9Rz1iJf19QQk18UEa7-jokWNo8jHIiUHsMdOh-WMIBZfoSRMzgTmQS2lKDIEDZn3Yj4mmJJ4M5KSTACSlQUAqnvWOGoULcNr-mLd5uASEUZtonsQJa61i76f5ZZ6OoUBAD4rMGob3do5aj3FwVsGdy5dYL4tsj16qSjJRgb2GCsbnZIz38uNkW3V-E5PoKofdozHz3uyo6Tp4d6hwhg1VxDGFcMU4V6mcaRtsnLA-jYipXqlQIBDG4u7jYOSEDwqotBgq87fETh6mH3zDOfTIKKp4zRU0Z4N2E7_TjeQ.jpg",
          linkUrl: "https://bstss.imamu.edu.sa/StudentSelfService",
          linkTitle: "بوابة الخدمة الذاتية (رفع الصورة)"
        },
        {
          sectionId: secServices.id,
          title: "كيفية إدخال أو تحديث الحساب البنكي (الآيبان) للمكافآت",
          description: "دليل ربط وتعديل رقم الآيبان (IBAN) لاستلام المكافأة الجامعية في حسابك البنكي المباشر دون تأخير.",
          text: "[{\"type\":\"text\",\"content\":\"لضمان إيداع المكافأة الشهرية في حسابك البنكي مباشرة دون تأخير أو تعليق، يجب التحقق من صحة رقم الآيبان المدخل ومطابقته لاسمك المسجل في الهوية الوطنية.\"},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"⚠️ شروط قبول الآيبان البنكي:\",\"content\":\"1. يجب أن يكون الحساب البنكي باسم الطالب/الطالبة حصراً (لا يُقبل حساب الوالد أو قريب).\\n2. التأكد من أن الحساب نشط وغير مجمد لدى البنك.\\n3. يبدأ الآيبان السعودي دائماً بالرمز **SA** متبوعاً بـ 22 رقماً.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول على [بوابة الخدمات الذاتية (IMS)](https://ims.imamu.edu.sa) بحسابك الجامعي.\",\"الانتقال إلى خيار **البيانات المالية / الحساب البنكي (الآيبان)**.\",\"إدخال رقم الآيبان كاملاً بدقة ثم إعادة تأكيده في الخانة الثانية.\",\"الضغط على **حفظ وإرسال للتحقق**، والانتظار حتى تظهر رسالة التأكيد والمطابقة مع نظام سداد ومؤسسة النقد.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة الخدمات الذاتية (IMS)\",\"url\":\"https://ims.imamu.edu.sa\"},{\"label\":\"بوابة الخدمة الذاتية (Banner)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"رفع مشكلة مكافأة عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"الدخول على [بوابة الخدمات الذاتية (IMS)](https://ims.imamu.edu.sa) بحسابك الجامعي.\",\"الانتقال إلى خيار **البيانات المالية / الحساب البنكي (الآيبان)**.\",\"إدخال رقم الآيبان كاملاً بدقة ثم إعادة تأكيده في الخانة الثانية.\",\"الضغط على **حفظ وإرسال للتحقق**، والانتظار حتى تظهر رسالة التأكيد والمطابقة مع نظام سداد ومؤسسة النقد.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/XiN6KKcA0ID17oariYuA0kfKBjrn9Xx-EfrnkU7fe8IhNd9Rz1iJf19QQk18UEa7-jokWNo8jHIiUHsMdOh-WMIBZfoSRMzgTmQS2lKDIEDZn3Yj4mmJJ4M5KSTACSlQUAqnvWOGoULcNr-mLd5uASEUZtonsQJa61i76f5ZZ6OoUBAD4rMGob3do5aj3FwVsGdy5dYL4tsj16qSjJRgb2GCsbnZIz38uNkW3V-E5PoKofdozHz3uyo6Tp4d6hwhg1VxDGFcMU4V6mcaRtsnLA-jYipXqlQIBDG4u7jYOSEDwqotBgq87fETh6mH3zDOfTIKKp4zRU0Z4N2E7_TjeQ.jpg",
          linkUrl: "https://ims.imamu.edu.sa",
          linkTitle: "بوابة الخدمات الذاتية (IMS)"
        },
        {
          sectionId: secServices.id,
          title: "دليل التقديم على السكن الجامعي للطلاب والطالبات",
          description: "شروط الإسكان الجامعي للطلاب القادمين من خارج الرياض، الرسوم، الأوراق المطلوبة، ومواعيد التقديم.",
          text: "[{\"type\":\"text\",\"content\":\"توفر جامعة الإمام مدينة سكنية متكاملة للطلاب والطالبات القادمين من مدن ومحافظات المملكة، مجهزة بالصالات الرياضية، المطاعم، شبكات الإنترنت، ووسائل النقل الداخلية إلى الكليات.\"},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"🏠 شروط القبول في السكن الجامعي:\",\"content\":\"• أن يكون الطالب منتظماً في مرحلة البكالوريوس أو الدراسات العليا.\\n• أن يبعد مقر إقامة أسرة الطالب الدائم عن مدينة الرياض مسافة لا تقل عن 80 كيلومتراً.\\n• ألا يكون قد صدر بحقه أي قرار تأديبي أو مخالفة للائحة السلوك الطلابي.\\n• دفع الرسوم الرمزية المقررة فصلياً.\"},{\"type\":\"steps\",\"stepsItems\":[\"متابعة فتح فترة التقديم على السكن المعلنة عبر [عمادة شؤون الطلاب](https://units.imamu.edu.sa/deanships/affairs/Pages/default.aspx).\",\"الدخول على بوابة التقديم الإلكتروني وتعبئة بيانات السكن وإرفاق إثبات مقر إقامة الأسرة (مثل صك البيت أو عقد إيجار أو تعريف عمل ولي الأمر).\",\"سداد الرسوم الرمزية المعتمدة عبر نظام سداد بعد إشعار القبول المبدئي.\",\"مراجعة إدارة الإسكان لاستلام مفتاح الغرفة وتوقيع التعهدات وإصدار تصريح دخول القرية السكنية.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"عمادة شؤون الطلاب - إدارة الإسكان\",\"url\":\"https://units.imamu.edu.sa/deanships/affairs/Pages/default.aspx\"},{\"label\":\"لائحة السكن الطلابي الرسمية\",\"url\":\"https://units.imamu.edu.sa/deanships/affairs/files/housing.pdf\"},{\"label\":\"استفسارات الإسكان عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"متابعة فتح فترة التقديم على السكن المعلنة عبر [عمادة شؤون الطلاب](https://units.imamu.edu.sa/deanships/affairs/Pages/default.aspx).\",\"الدخول على بوابة التقديم الإلكتروني وتعبئة بيانات السكن وإرفاق إثبات مقر إقامة الأسرة (مثل صك البيت أو عقد إيجار أو تعريف عمل ولي الأمر).\",\"سداد الرسوم الرمزية المعتمدة عبر نظام سداد بعد إشعار القبول المبدئي.\",\"مراجعة إدارة الإسكان لاستلام مفتاح الغرفة وتوقيع التعهدات وإصدار تصريح دخول القرية السكنية.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "https://units.imamu.edu.sa/deanships/affairs/Pages/default.aspx",
          linkTitle: "عمادة شؤون الطلاب - إدارة الإسكان"
        },
        {
          sectionId: secServices.id,
          title: "الاستفادة من مصادر المكتبة المركزية والمكتبة الرقمية السعودية (SDL)",
          description: "كيفية البحث في ملايين الكتب والرسائل العلمية، تفعيل حساب المكتبة الرقمية، والاستعارة من المكتبة المركزية.",
          text: "[{\"type\":\"text\",\"content\":\"تضم المكتبة المركزية بجامعة الإمام (مكتبة الأمير سلطان للعلوم والمعرفة) كنزاً معرفياً ضخماً من الكتب والمخطوطات والرسائل الجامعية، إلى جانب وصول مجاني كامل لـ **المكتبة الرقمية السعودية (SDL)** التي تحتوي على ملايين الأبحاث والدوريات العالمية المحكمة مجاناً لجميع الطلاب.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول على [بوابة المكتبة الرقمية السعودية SDL](https://sdl.edu.sa) والضغط على \\\"تسجيل الدخول بالجامعة\\\".\",\"اختيار \\\"جامعة الإمام محمد بن سعود الإسلامية\\\" وتسجيل الدخول بالبريد الجامعي وكلمة المرور.\",\"البحث باسم المقرر، الباحث، أو الكلمات المفتاحية لتحميل الكتب والأبحاث الكاملة بصيغة PDF مجاناً.\",\"لزيارة المكتبة المركزية الواقعة بالحرم الجامعي: يمكنك حجز غرف الدراسة الجماعية واستعارة الكتب الورقية باستخدام بطاقتك الجامعية.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة المكتبة الرقمية السعودية (SDL)\",\"url\":\"https://sdl.edu.sa\"},{\"label\":\"عمادة شؤون المكتبات بالجامعة\",\"url\":\"https://units.imamu.edu.sa/deanships/library/Pages/default.aspx\"},{\"label\":\"فهرس الكتب والمخطوطات الآلي\",\"url\":\"https://library.imamu.edu.sa\"}]}]",
          steps: "[\"الدخول على [بوابة المكتبة الرقمية السعودية SDL](https://sdl.edu.sa) والضغط على \\\"تسجيل الدخول بالجامعة\\\".\",\"اختيار \\\"جامعة الإمام محمد بن سعود الإسلامية\\\" وتسجيل الدخول بالبريد الجامعي وكلمة المرور.\",\"البحث باسم المقرر، الباحث، أو الكلمات المفتاحية لتحميل الكتب والأبحاث الكاملة بصيغة PDF مجاناً.\",\"لزيارة المكتبة المركزية الواقعة بالحرم الجامعي: يمكنك حجز غرف الدراسة الجماعية واستعارة الكتب الورقية باستخدام بطاقتك الجامعية.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "https://sdl.edu.sa",
          linkTitle: "بوابة المكتبة الرقمية السعودية (SDL)"
        },
        {
          sectionId: secPlatforms.id,
          title: "طريقة تفعيل البريد الجامعي للطلاب وحزمة Office 365 المجانية",
          description: "خطوات تسجيل الدخول للبريد الأكاديمي الرسمي (@sm.imamu.edu.sa) وتفعيل حزمة برامج مايكروسوفت أوفيس والتخزين السحابي OneDrive مجاناً.",
          text: "[{\"type\":\"text\",\"content\":\"تمنح جامعة الإمام كل طالب وطالبة حساب مايكروسوفت 365 رسمياً مجاناً طوال سنوات الدراسة. يوفر لك هذا الحساب:\\n- تحميل برامج Word و Excel و PowerPoint الأصلية على 5 أجهزة.\\n- مساحة تخزين سحابية ضخمة 1 تيرابايت على OneDrive.\\n- الحصول على تخفيضات الطلاب العالمية من Apple و Spotify و GitHub وغيرها.\"},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"🔑 صيغة بريدك الجامعي المعتمدة:\",\"content\":\"اسم المستخدم هو: **الرقم_الجامعي@sm.imamu.edu.sa** (مثال: `445012345@sm.imamu.edu.sa`).\\nكلمة المرور هي نفس كلمة مرور نظام الخدمة الذاتية (بانر) أو ما وصلك في رسالة القبول الرسمية.\"},{\"type\":\"steps\",\"stepsItems\":[\"افتح صفحة [تسجيل دخول مايكروسوفت 365](https://portal.office.com).\",\"اكتب بريدك بصيغة: `الرقم_الجامعي@sm.imamu.edu.sa` واضغط التالي.\",\"أدخل كلمة المرور الخاصة بك.\",\"عند المطالبة بالأمان، حمّل تطبيق [Microsoft Authenticator](https://apps.apple.com/app/microsoft-authenticator/id983156458) على جوالك وامسح رمز الـ QR لتأمين حسابك برقم التحقق.\",\"بعد الدخول، اضغط على زر **تثبيت التطبيقات (Install Office)** لتحميل البرامج مجاناً على جهازك الشخصي.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة تسجيل دخول مايكروسوفت 365\",\"url\":\"https://portal.office.com\"},{\"label\":\"بريد الطلاب Outlook Web\",\"url\":\"https://outlook.office365.com\"},{\"label\":\"تطبيق Authenticator (آيفون)\",\"url\":\"https://apps.apple.com/app/microsoft-authenticator/id983156458\"},{\"label\":\"تطبيق Authenticator (أندرويد)\",\"url\":\"https://play.google.com/store/apps/details?id=com.azure.authenticator\"},{\"label\":\"الدعم الفني وتقنية المعلومات\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"افتح صفحة [تسجيل دخول مايكروسوفت 365](https://portal.office.com).\",\"اكتب بريدك بصيغة: `الرقم_الجامعي@sm.imamu.edu.sa` واضغط التالي.\",\"أدخل كلمة المرور الخاصة بك.\",\"عند المطالبة بالأمان، حمّل تطبيق [Microsoft Authenticator](https://apps.apple.com/app/microsoft-authenticator/id983156458) على جوالك وامسح رمز الـ QR لتأمين حسابك برقم التحقق.\",\"بعد الدخول، اضغط على زر **تثبيت التطبيقات (Install Office)** لتحميل البرامج مجاناً على جهازك الشخصي.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "https://portal.office.com",
          linkTitle: "بوابة تسجيل دخول مايكروسوفت 365"
        },
        {
          sectionId: secPlatforms.id,
          title: "دليل الدخول لنظام التعلم الإلكتروني (بلاك بورد Blackboard)",
          description: "طريقة الدخول لنظام الفصول الافتراضية وحل الواجبات، متابعة الإعلانات والمحاضرات المسجلة على Blackboard Learn.",
          text: "[{\"type\":\"text\",\"content\":\"نظام **البلاك بورد (Blackboard Learn)** هو المنصة التعليمية الرسمية لجامعة الإمام. من خلاله يرفع أساتذة المقررات السلايدات، الواجبات، الكويزات، روابط الفصول الافتراضية (Blackboard Collaborate)، وإعلانات الشعب أولاً بأول.\"},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"⚠️ المواد لا تظهر في بلاك بورد؟\",\"content\":\"إذا قمت بحذف أو إضافة مادة مؤخراً بالخدمة الذاتية، فإن مزامنة الشعب في البلاك بورد تستغرق من **12 إلى 24 ساعة** لتظهر في حسابك تلقائياً. لا تقلق وانتظر تحديث النظام اليومي.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول على [رابط بوابة بلاك بورد الإمام](https://lms.imamu.edu.sa).\",\"اسم المستخدم: الرقم الجامعي فقط (بدون @sm).\\nكلمة المرور: كلمة مرورك المعتمدة بالجامعة.\",\"من القائمة الجانبية، اضغط على **المقررات الدراسية (Courses)** لتظهر لك جميع مواد الفصل الحالي.\",\"ادخل على كل مقرر وتفقد خانة **المحتوى (Content)** للمذكرات وخانة **الواجبات (Assessments)** لتسليم المهام في موعدها.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"تسجيل الدخول لبلاك بورد\",\"url\":\"https://lms.imamu.edu.sa\"},{\"label\":\"تطبيق Blackboard (آيفون)\",\"url\":\"https://apps.apple.com/app/blackboard-learn/id950524961\"},{\"label\":\"تطبيق Blackboard (أندرويد)\",\"url\":\"https://play.google.com/store/apps/details?id=com.blackboard.android.bbstudent\"},{\"label\":\"الدعم الفني للبلاك بورد عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"الدخول على [رابط بوابة بلاك بورد الإمام](https://lms.imamu.edu.sa).\",\"اسم المستخدم: الرقم الجامعي فقط (بدون @sm).\\nكلمة المرور: كلمة مرورك المعتمدة بالجامعة.\",\"من القائمة الجانبية، اضغط على **المقررات الدراسية (Courses)** لتظهر لك جميع مواد الفصل الحالي.\",\"ادخل على كل مقرر وتفقد خانة **المحتوى (Content)** للمذكرات وخانة **الواجبات (Assessments)** لتسليم المهام في موعدها.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/Xj2dHwkVhq_Tn3rbK0Lh9-J8rlOxa4iT67m7aDgYTpi6pBVhghaRnw6Cw9MaUMMXFSgkt_EFoJ0AqmQwMx0r4w8LD9WlWQ2I-eiwQ78QWzHrughOwZC7zxzKsH8Ge2zbwpfPkqS9DRumBNWY6JFUlCx3wF1QdtZvRzrvNE29MRVvflYufK4HW1TjiKe4xt28gt80RX0Z9pyQ3j5qJoxjN7QwXikkuRGiLddUU3x4hOc0pbZxOotDQupOwHO2xwkw51M7NDuEQTI3QLErMpFSlVqHqUuoCglEA6uRoMv18ahOscQGX730j4XPHdUuWUJZwFjdykCyZrV4pHSu2GIbAw.jpg",
          linkUrl: "https://lms.imamu.edu.sa",
          linkTitle: "تسجيل الدخول لبلاك بورد"
        },
        {
          sectionId: secPlatforms.id,
          title: "طريقة الاتصال بشبكة الإنترنت والواي فاي (Wi-Fi) بالمدينة الجامعية",
          description: "خطوات ضبط وإعداد شبكة الطلاب اللاسلكية (IMAMU-Student) على الهواتف وأجهزة اللابتوب مجاناً.",
          text: "[{\"type\":\"text\",\"content\":\"توفر عمادة تقنية المعلومات شبكة إنترنت عالية السرعة تغطي جميع كليات ومباني المدينة الجامعية للطلاب والطالبات مجاناً تحت اسم **IMAMU-Student**.\"},{\"type\":\"steps\",\"stepsItems\":[\"افتح إعدادات الـ Wi-Fi بجهازك واختر شبكة **IMAMU-Student**.\",\"طريقة المصادقة: اختر **WPA2-Enterprise** أو **PEAP**.\",\"الشهادة (CA Certificate): اختر **عدم التحقق (Do not validate)** أو Trust on first use.\",\"اسم المستخدم (Identity): اكتب رقمك الجامعي فقط (مثال: `445012345`).\",\"كلمة المرور: اكتب نفس كلمة مرور بريدك الجامعي والخدمة الذاتية واضغط اتصال (Connect).\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة عمادة تقنية المعلومات\",\"url\":\"https://imamu.edu.sa\"},{\"label\":\"بلاغات أعطال الشبكة عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"افتح إعدادات الـ Wi-Fi بجهازك واختر شبكة **IMAMU-Student**.\",\"طريقة المصادقة: اختر **WPA2-Enterprise** أو **PEAP**.\",\"الشهادة (CA Certificate): اختر **عدم التحقق (Do not validate)** أو Trust on first use.\",\"اسم المستخدم (Identity): اكتب رقمك الجامعي فقط (مثال: `445012345`).\",\"كلمة المرور: اكتب نفس كلمة مرور بريدك الجامعي والخدمة الذاتية واضغط اتصال (Connect).\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "https://imamu.edu.sa",
          linkTitle: "بوابة عمادة تقنية المعلومات"
        },
        {
          sectionId: secPlatforms.id,
          title: "دليل تقديم التذاكر والاستفسارات عبر بوابة \"تواصل\" الرسمية",
          description: "كيف ترفع تذكرة دعم رسمي لعمادة القبول والتسجيل، شؤون الطلاب، أو تقنية المعلومات ومتابعة الرد.",
          text: "[{\"type\":\"text\",\"content\":\"بوابة **تواصل** هي المنصة المركزية الموحدة لجميع خدمات الجامعة. بدلاً من الذهاب حضورياً للعمادات، يمكنك رفع أي طلب أكاديمي، استفسار عن مكافأة، مشكلة تقنية، أو تقديم عذر غياب ومتابعة حالة التذكرة برقم طلب رسمي.\"},{\"type\":\"steps\",\"stepsItems\":[\"الدخول على [بوابة تواصل الموحدة](https://tawasol.imamu.edu.sa).\",\"تسجيل الدخول عبر خيار **الطلاب** بالرقم الجامعي وكلمة السر أو بالنفاذ الوطني الموحد.\",\"الضغط على **إنشاء تذكرة جديدة** واختيار الجهة المعنية (عمادة القبول والتسجيل، شؤون الطلاب، كليتك، أو تقنية المعلومات).\",\"كتابة عنوان واضح وشرح مختصر للمشكلة مع إرفاق صور أو ملفات داعمة (مثل لقطة الشاشة للخطأ).\",\"إرسال التذكرة ومتابعة الردود من خلال رسائل الجوال أو صفحة تذاكري.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة تواصل الموحدة\",\"url\":\"https://tawasol.imamu.edu.sa\"},{\"label\":\"تطبيق تواصل على App Store\",\"url\":\"https://apps.apple.com/app/tawasol-imamu/id1527581132\"},{\"label\":\"دليل الاتصال المباشر بعمادات الجامعة\",\"url\":\"https://imamu.edu.sa/contact\"}]}]",
          steps: "[\"الدخول على [بوابة تواصل الموحدة](https://tawasol.imamu.edu.sa).\",\"تسجيل الدخول عبر خيار **الطلاب** بالرقم الجامعي وكلمة السر أو بالنفاذ الوطني الموحد.\",\"الضغط على **إنشاء تذكرة جديدة** واختيار الجهة المعنية (عمادة القبول والتسجيل، شؤون الطلاب، كليتك، أو تقنية المعلومات).\",\"كتابة عنوان واضح وشرح مختصر للمشكلة مع إرفاق صور أو ملفات داعمة (مثل لقطة الشاشة للخطأ).\",\"إرسال التذكرة ومتابعة الردود من خلال رسائل الجوال أو صفحة تذاكري.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/XiN6KKcA0ID17oariYuA0kfKBjrn9Xx-EfrnkU7fe8IhNd9Rz1iJf19QQk18UEa7-jokWNo8jHIiUHsMdOh-WMIBZfoSRMzgTmQS2lKDIEDZn3Yj4mmJJ4M5KSTACSlQUAqnvWOGoULcNr-mLd5uASEUZtonsQJa61i76f5ZZ6OoUBAD4rMGob3do5aj3FwVsGdy5dYL4tsj16qSjJRgb2GCsbnZIz38uNkW3V-E5PoKofdozHz3uyo6Tp4d6hwhg1VxDGFcMU4V6mcaRtsnLA-jYipXqlQIBDG4u7jYOSEDwqotBgq87fETh6mH3zDOfTIKKp4zRU0Z4N2E7_TjeQ.jpg",
          linkUrl: "https://tawasol.imamu.edu.sa",
          linkTitle: "بوابة تواصل الموحدة"
        },
        {
          sectionId: secRegulations.id,
          title: "ضوابط نسب الغياب، الحرمان الأكاديمي (DN)، ورفع الأعذار الطبية",
          description: "جدول تفصيلي لحساب ساعات الغياب ونسب الإنذار والحرمان (DN) لكل مادة، وضوابط رفع إجازات تطبيق صحتي المعتمدة.",
          text: "[{\"type\":\"text\",\"content\":\"الغياب في جامعة الإمام يُحسب **بالساعات الفعلية** للمقرر خلال الفصل الدراسي (15 أسبوعاً)، وتصل نسبة الحرمان الأكاديمي الرسمي إلى **25%** من مجموع ساعات الاتصال. لا تهمل حضورك؛ فالحرمان يرصد كرسوب بصفر نقاط ويؤثر بشكل مدمر على المعدل التراكمي!\"},{\"type\":\"callout\",\"variant\":\"danger\",\"title\":\"⚠️ قواعد صارمة في التأخير والغياب يجب أن تعرفها:\",\"content\":\"• تأخير 10 دقائق عن موعد المحاضرة يُسجل تأخيراً رسمياً في سجل التحضير.\\n• كل تأخيرين أو ثلاثة (حسب نظام أستاذ المقرر والكلية) يُحتسبان غياب ساعة كاملة!\\n• عند رصد الحرمان (DN)، يُحرم الطالب من دخول الاختبار النهائي ويُرصد له تقدير محروم (درجة صفر) ويدخل في حساب المعدل كرسوب.\"},{\"type\":\"table\",\"tableHeaders\":[\"ساعات المقرر بالأسبوع\",\"إجمالي ساعات الفصل (~15 أسبوع)\",\"الإنذار الأول (10% غياب)\",\"الإنذار الثاني (20% غياب)\",\"الحرمان الأكاديمي DN (25%)\",\"أقصى حد مع عذر معتمد (50%)\"],\"tableRows\":[[\"ساعة واحدة أسبوعياً\",\"15 ساعة\",\"غياب 1.5 ساعة (المحاضرة 2)\",\"غياب 3 ساعات (المحاضرة 3)\",\"🚨 غياب 4 ساعات (المحاضرة 4)\",\"حد أقصى 7.5 ساعات غياب\"],[\"ساعتان أسبوعياً\",\"30 ساعة\",\"غياب 3 ساعات\",\"غياب 6 ساعات\",\"🚨 غياب 8 ساعات (محاضرتان كاملتان)\",\"حد أقصى 15 ساعة غياب\"],[\"3 ساعات أسبوعياً (أغلب المواد)\",\"45 ساعة\",\"غياب 4.5 ساعات\",\"غياب 9 ساعات\",\"🚨 غياب 12 ساعة (4 محاضرات)\",\"حد أقصى 22.5 ساعة غياب\"],[\"4 ساعات أسبوعياً\",\"60 ساعة\",\"غياب 6 ساعات\",\"غياب 12 ساعة\",\"🚨 غياب 15 - 16 ساعة\",\"حد أقصى 30 ساعة غياب\"],[\"5 ساعات أسبوعياً (المواد المكثفة)\",\"75 ساعة\",\"غياب 7.5 ساعات\",\"غياب 15 ساعة\",\"🚨 غياب 19 - 20 ساعة\",\"حد أقصى 37.5 ساعة غياب\"]]},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"💡 استثناء مجلس الكلية لرفع الحرمان بعذر:\",\"content\":\"يجوز لمجلس الكلية التي يتبع لها المقرر استثنائياً رفع الحرمان والسماح للطالب بدخول الاختبار النهائي إذا قدّم عذراً قهرياً تقبله الكلية، **بشرط ألا تقل نسبة حضوره عن 50%** من ساعات الاتصال للمقرر (أي ألا يتجاوز غيابه نصف الفصل).\"},{\"type\":\"steps\",\"stepsItems\":[\"استخراج الإجازة المرضية إلكترونياً من [تطبيق صحتي (Sehhaty)](https://sehhaty.sa) والتأكد من صدور رمز الخدمة والتقرير المعتمد من وزارة الصحة.\",\"تحميل التقرير الطبي بصيغة PDF من قسم الإجازات المرضية داخل تطبيق صحتي.\",\"تقديم العذر خلال **5 أيام عمل** كحد أقصى من تاريخ العودة للدراسة، لأن اللائحة تمنع قبول الأعذار المتأخرة نظاماً.\",\"رفع العذر عبر [بوابة تواصل الموحدة](https://tawasol.imamu.edu.sa) إلى وحدة الشؤون التعليمية بكليتك مع تحديد أسماء المقررات وتواريخ الغياب.\",\"متابعة حالة العذر والتأكد من اعتماده ومراجعة أستاذ المقرر لتعديل سجل الحضور بالخدمة الذاتية وإلغاء الحرمان.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة تطبيق صحتي (الإجازات المرضية)\",\"url\":\"https://sehhaty.sa\"},{\"label\":\"بوابة الخدمة الذاتية (Banner) لسجل الغياب\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"بوابة تواصل الموحدة لرفع الأعذار الطبية\",\"url\":\"https://tawasol.imamu.edu.sa\"},{\"label\":\"لائحة الدراسة والاختبارات الجامعية الرسمية\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/files/study_regulation.pdf\"}]}]",
          steps: "[\"استخراج الإجازة المرضية إلكترونياً من [تطبيق صحتي (Sehhaty)](https://sehhaty.sa) والتأكد من صدور رمز الخدمة والتقرير المعتمد من وزارة الصحة.\",\"تحميل التقرير الطبي بصيغة PDF من قسم الإجازات المرضية داخل تطبيق صحتي.\",\"تقديم العذر خلال **5 أيام عمل** كحد أقصى من تاريخ العودة للدراسة، لأن اللائحة تمنع قبول الأعذار المتأخرة نظاماً.\",\"رفع العذر عبر [بوابة تواصل الموحدة](https://tawasol.imamu.edu.sa) إلى وحدة الشؤون التعليمية بكليتك مع تحديد أسماء المقررات وتواريخ الغياب.\",\"متابعة حالة العذر والتأكد من اعتماده ومراجعة أستاذ المقرر لتعديل سجل الحضور بالخدمة الذاتية وإلغاء الحرمان.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/mnXY5PixbaxrhTdX0CSyOCXEDvyTKayoNcivp_9bJ_lluga98IjREYw93z08142GsBdnAsGOZHujlcaFLApKAqnRU4GViHvpSPNYttm-pkh9lqNpXYIr1cef7BzfnWOqbprV2mDo1lqUezfPSlJQRiseYsVdUY8xxC-kaoMIT05U0nNZmSgY9rKfLWxkLmzW_1lnF6cvfKY6xNu5gaJI4fmixRHgTkZgtOFPK4IEM8QK0seQA48wvcpI5q6MIJ5jkGkeo4-dEKIhb3medqS41kbThfJUFPEs3R42AHsbGHAOlt5dsKSNlQKhfTK0lmHYzU2_08DB6ic0QmVkY37SCA.jpg",
          linkUrl: "https://sehhaty.sa",
          linkTitle: "بوابة تطبيق صحتي (الإجازات المرضية)"
        },
        {
          sectionId: secRegulations.id,
          title: "طريقة الاعتذار عن فصل دراسي أو الانسحاب من مقرر دراسي",
          description: "الفرق بين الاعتذار والتأجيل وحذف المقررات، شروط قبول العذر، وأثره على السجل الأكاديمي والمكافأة.",
          text: "[{\"type\":\"text\",\"content\":\"إذا واجهتك ظروف قاهرة أثناء دراستك بالفصل، يتيح لك النظام الجامعي الانسحاب النظامي دون أن تتضرر درجاتك بالرسوب، إما عن طريق **الاعتذار عن الفصل بأكمله** أو **حذف مقرر/مقررين (الانسحاب بعذر)**.\"},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"📌 ما الفرق بين الاعتذار والتأجيل؟\",\"content\":\"• **التأجيل**: يكون *قبل* بداية الفصل الدراسي، ولا يُحسب الفصل من المدة النظامية للتخرج ولا يؤثر على مرتبة الشرف.\\n• **الاعتذار**: يكون *أثناء* الفصل الدراسي (خلال الفترة المحددة بالتقويم)، ويُرصد للطالب تقدير (ع / W) ولا يؤثر على المعدل التراكمي، لكن الفصل يُحسب من المدة النظامية، وتتوقف المكافأة خلال فترة الاعتذار.\"},{\"type\":\"steps\",\"stepsItems\":[\"الاطلاع على موعد نهاية فترة الاعتذار المحددة في [التقويم الأكاديمي](https://units.imamu.edu.sa/deanships/admission/Pages/calendar.aspx).\",\"الدخول على [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService).\",\"الانتقال إلى خيار **الاعتذار عن فصل دراسي** أو **حذف مقرر دراسي بعذر**.\",\"تحديد المادة أو الفصل مع كتابة المبرر وإرفاق العذر إن وجد ثم تقديم الطلب.\",\"التأكد من رصد تقدير **منسحب بعذر (W)** في سجلك الدراسي بعد موافقة عمادة القبول والتسجيل.\"]},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"بوابة الخدمة الذاتية (طلب الاعتذار)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"التقويم الأكاديمي لمواعيد نهاية الاعتذار\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/Pages/calendar.aspx\"},{\"label\":\"مراجعة شؤون الطلاب عبر تواصل\",\"url\":\"https://tawasol.imamu.edu.sa\"}]}]",
          steps: "[\"الاطلاع على موعد نهاية فترة الاعتذار المحددة في [التقويم الأكاديمي](https://units.imamu.edu.sa/deanships/admission/Pages/calendar.aspx).\",\"الدخول على [بوابة الخدمة الذاتية (Banner)](https://bstss.imamu.edu.sa/StudentSelfService).\",\"الانتقال إلى خيار **الاعتذار عن فصل دراسي** أو **حذف مقرر دراسي بعذر**.\",\"تحديد المادة أو الفصل مع كتابة المبرر وإرفاق العذر إن وجد ثم تقديم الطلب.\",\"التأكد من رصد تقدير **منسحب بعذر (W)** في سجلك الدراسي بعد موافقة عمادة القبول والتسجيل.\"]",
          imageUrl: "https://cdn4.telesco.pe/file/kbMXpvU4yKE_hEMuSIyixQTQBpUZysytP0-4AR62c7AFpV8nm2aRVRT2hbP9qViSFEXbaOcgb90Gz2s66cenXa8CfzPDmmqF8vW2pM3xMx65pxrGKSkGoIwt5nL1Sgnz5szvO5qk5bDj21zSdeGPZ7p5EGpj3o_Fftfdih9sOuiFT_pvy-azAUN5dK6GonDKERLbBg9O8amnjRTmLbsOWYdzLupCuWN1k-3BUp4RgorXK6L3dRvW7FJ80EceYpyYaiMmtuCRr1Frlm5anI0Aec6vlcblxEjbuyxryv84sEv6JPR4U2y0BpIbxGVNb5_S7-L729f8ZrFob57kcIicMw.jpg",
          linkUrl: "https://bstss.imamu.edu.sa/StudentSelfService",
          linkTitle: "بوابة الخدمة الذاتية (طلب الاعتذار)"
        },
        {
          sectionId: secRegulations.id,
          title: "شروط وضوابط مرتبة الشرف الأولى والثانية عند التخرج",
          description: "شروط استحقاق مرتبة الشرف الأولى والثانية عند التخرج من البكالوريوس والضوابط المانعة لها.",
          text: "[{\"type\":\"text\",\"content\":\"تمنح جامعة الإمام محمد بن سعود الإسلامية مرتبة الشرف للطلاب المتفوقين في حفل التخرج الرسمي، وتُسجل في الوثيقة والسجل الأكاديمي، وهي ميزة تنافسية كبرى عند التقديم على الوظائف وبرامج الدراسات العليا والابتعاث.\"},{\"type\":\"table\",\"tableHeaders\":[\"نوع مرتبة الشرف\",\"المعدل التراكمي المطلوب\",\"النسبة المئوية التقريبية\",\"المزايا\"],\"tableRows\":[[\"مرتبة الشرف الأولى\",\"من 4.75 إلى 5.00 من 5.00\",\"95% فأعلى\",\"تكريم خاص + أولوية معيدين ووظائف كبرى\"],[\"مرتبة الشرف الثانية\",\"من 4.25 إلى أقل من 4.75\",\"85% إلى أقل من 95%\",\"تدوين في وثيقة التخرج + أولوية تنافسية\"]]},{\"type\":\"callout\",\"variant\":\"warning\",\"title\":\"📋 الشروط النظامية الصارمة لاستحقاق مرتبة الشرف:\",\"content\":\"1. **عدم الرسوب إطلاقاً**: ألا يكون الطالب قد رسب في أي مقرر درسه في الجامعة أو في جامعة أخرى تمت معادلتها.\\n2. **المدة النظامية**: أن يكمل الطالب متطلبات التخرج في مدة أقصاها متوسط المدة بين الحد الأدنى والحد الأقصى للبقاء في الكلية (المدة النظامية للتخصص دون تأخير).\\n3. **ساعات الجامعة**: أن يكون الطالب قد درس في جامعة الإمام ما لا يقل عن 60% من متطلبات التخرج الإجمالية.\"},{\"type\":\"callout\",\"variant\":\"info\",\"title\":\"💡 هل الاعتذار يمنع مرتبة الشرف؟\",\"content\":\"الاعتذار النظامي عن فصل لا يُعد رسوباً ولا يحرمك من مرتبة الشرف لذاته، بشرط ألا يتسبب في تجاوزك للمدة النظامية المقررة للتخرج في كليتك.\"},{\"type\":\"buttons\",\"buttons\":[{\"label\":\"حاسبة المعدل التراكمي بموقعنا\",\"url\":\"/tools\"},{\"label\":\"السجل الأكاديمي ومتابعة المعدل (بانر)\",\"url\":\"https://bstss.imamu.edu.sa/StudentSelfService\"},{\"label\":\"لائحة الدراسة والاختبارات الجامعية\",\"url\":\"https://units.imamu.edu.sa/deanships/admission/files/study_regulation.pdf\"}]}]",
          steps: "[]",
          imageUrl: "https://cdn4.telesco.pe/file/uw0Zjm4XfPGzlIHsPzm267KOaFIQxkcAzn2GmC9B1OEPYZTYaEVJ3ubnOiwbejdMSSLNNz7PZ65nUYpl_5OKJcWhnZrTz7RKh1MxayVyBqwtB5nTXFyYE5_vE7kXtuUq2WCT189g3fgOlehGtqSTwf7f7taqvH6vL70wMUw0BWD7wbMcSEPhMWymaM3xYnS_2OPH_q9S1ZnXxC2ak_8AuIm9dXrVbAzRwbvkyREmOZsKlLU1xbLBpyzL5GzxT525sGYIuyWanMxszQruytGE4JRBhmXsljKVS5VMUmN9LMa-hLg880tXT728fFqeU_vkecVzIVOj4K1_qvNsNTn33g.jpg",
          linkUrl: "/tools",
          linkTitle: "حاسبة المعدل التراكمي بموقعنا"
        }
      ]);
    }

    // Seed newbie links
    const existingLinks = await db.select().from(newbie_links);
    if (existingLinks.length === 0) {
      console.log('[DB] Seeding default newbie links...');
      await db.insert(newbie_links).values([
        {
          title: 'بوابة الخدمات الذاتية (Banner)',
          url: 'https://bstss.imamu.edu.sa/StudentSelfService',
          description: 'البوابة الرسمية لتسجيل المقررات، إعداد الجداول، ومعرفة المعدل التراكمي والسجل الأكاديمي.'
        },
        {
          title: 'نظام التعليم الإلكتروني (Blackboard)',
          url: 'https://lms.imamu.edu.sa',
          description: 'منصة التعليم الإلكتروني الرسمية لحضور المحاضرات الافتراضية، وحل الواجبات، ومتابعة الاختبارات.'
        },
        {
          title: 'بوابة البريد الإلكتروني الجامعي',
          url: 'https://mail.imamu.edu.sa/imamowa/',
          description: 'الوصول لبريدك الأكاديمي الرسمي وتفعيل الحساب الجامعي واستقبال الإعلانات الهامة.'
        },
        {
          title: 'الموقع الرسمي لجامعة الإمام',
          url: 'https://imamu.edu.sa',
          description: 'موقع الجامعة الإلكتروني للاطلاع على أخبار العمادات، الكليات، والتقويم الدراسي المعتمد.'
        }
      ]);
    }

    // Run external image sync asynchronously in the background so server boot is not blocked
    setImmediate(() => {
      syncExternalImagesToStorage(db).catch((err: any) => {
        console.error('[Storage Sync Error]', err.message || err);
      });
    });

  } catch (e: any) {
    console.error('[DB] Seeding failed, likely due to migration in progress:', e.message || e);
  }
}
