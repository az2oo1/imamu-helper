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
        color: 'text-[var(--color-imamu-accent)] bg-stone-50 border-stone-100/50'
      }).returning();

      const [secServices] = await db.insert(tutorial_sections).values({
        title: 'الخدمات والمكافآت',
        icon: 'CreditCard',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50'
      }).returning();

      await db.insert(tutorials).values([
        {
          sectionId: secAcademic.id,
          title: 'كيف تسجل المواد في الخدمة الذاتية؟',
          description: 'شرح مبسط لكيفية إعداد جدولك الأكاديمي وتسجيل المواد عبر نظام الخدمة الذاتية (Banner).',
          text: 'تسجيل المواد يفتح عادة في فترات محددة حسب جدول التسجيل المقر من عمادة القبول والتسجيل، وتتأثر الأولويات بالمعدل التراكمي وعدد الساعات المنجزة.',
          steps: JSON.stringify([
            'ادخل إلى نظام الخدمة الذاتية باستخدام رقمك الجامعي وكلمة المرور الخاصة بك.',
            'اختر صفحة "التسجيل" ثم اضغط على "التسجيل وتنزيل المواد".',
            'اختر الفصل الدراسي المناسب (مثال: الفصل الدراسي الأول 1448 هـ).',
            'أدخل الرموز المرجعية للمواد (CRN) التي قمت بإعدادها مسبقاً، واضغط على "إضافة إلى الجدول".',
            'تأكد من الضغط على زر "تقديم / Submit" في أسفل اليسار لتثبيت المواد وضمان تسجيلها.'
          ]),
          linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
          linkTitle: 'بوابة الخدمة الذاتية (Banner)'
        },
        {
          sectionId: secAcademic.id,
          title: 'كيف أحسب معدلي التراكمي؟',
          description: 'دليل خطوة بخطوة لاستخدام حاسبة المعدل التراكمي والفصلي بفعالية.',
          text: 'تتيح لك حاسبة المعدل التنبؤ بمعدلك التراكمي والفصلي بدقة، مما يساعدك على تخطيط درجاتك في الفصول القادمة للحفاظ على معدل مرتفع أو تفادي الإنذارات الأكاديمية.',
          steps: JSON.stringify([
            'انتقل إلى قسم الأدوات من القائمة الرئيسية، ثم اختر "حاسبة المعدل".',
            'أدخل معدلك الحالي التراكمي وعدد الساعات المكتسبة الحالية (تجدها في سجلك الأكاديمي).',
            'أدخل درجات المواد المتوقعة للفصل الحالي وعدد الساعات المعتمدة لكل مادة.',
            'اضغط على زر "احسب" للحصول على النتيجة وملاحظات الأداء فوراً.'
          ]),
          linkUrl: '/tools',
          linkTitle: 'حاسبة المعدل التراكمي'
        },
        {
          sectionId: secAcademic.id,
          title: 'كيف أصل لمصادر ومجموعات المواد؟',
          description: 'دليل تصفح قسم المصادر للحصول على الملفات الدراسية، الاختبارات السابقة، ومجموعات التواصل.',
          text: 'يحتوي قسم المصادر على ملفات هامة يشاركها زملاؤك الطلاب، بالإضافة إلى روابط مجموعات الواتساب الرسمية لكل مادة لتسهيل التواصل والتعاون الأكاديمي.',
          steps: JSON.stringify([
            'توجه إلى قسم "المصادر" من القائمة العلوية للمنصة.',
            'استخدم مربع البحث السريع أو الفلاتر لتحديد مستواك الدراسي.',
            'انقر على بطاقة المادة التي ترغب في تصفحها.',
            'ستظهر لك روابط مجموعات الواتساب وملفات جوجل درايف الخاصة بالمادة لتحميلها.'
          ]),
          linkUrl: '/resources',
          linkTitle: 'بنك المصادر الأكاديمية'
        },
        {
          sectionId: secAcademic.id,
          title: 'كيف أحول من تخصص إلى آخر؟',
          description: 'شروط وضوابط التحويل بين التخصصات والكليات داخل جامعة الإمام والمواعيد المعتادة.',
          text: 'يتاح التحويل نهاية كل فصل دراسي عبر الخدمة الذاتية، ويعتمد قبول طلبك بشكل أساسي على توفر المقاعد ومعدلك التراكمي مقارنة بالطلاب المتقدمين الآخرين.',
          steps: JSON.stringify([
            'تأكد من استيفائك لشروط التحويل الخاصة بالكلية المستهدفة (مثل اجتياز ساعات محددة أو حد أدنى للمعدل).',
            'ادخل للخدمة الذاتية خلال فترة التقديم المعلنة في التقويم الدراسي.',
            'انتقل إلى "الخدمات الأكاديمية" ثم اختر "طلب التحويل الداخلي".',
            'حدد الكلية والتخصص المطلوب كأولوية أولى، وقم بتقديم طلبك.',
            'تابع حالة الطلب بانتظام عبر النظام لمعرفة قرار اللجنة الأكاديمية.'
          ]),
          linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
          linkTitle: 'تقديم طلب تحويل بالخدمة الذاتية'
        },
        {
          sectionId: secServices.id,
          title: 'كيف أتتبع موعد نزول المكافأة؟',
          description: 'طريقة التحقق من العد التنازلي وتاريخ نزول المكافآت الجامعية شهرياً.',
          text: 'تنزل المكافأة الجامعية لطلاب جامعة الإمام عادة في اليوم 27 من كل شهر ميلادي، ما لم يصادف عطلة نهاية الأسبوع حيث يتم تقديمها أو تأخيرها يوماً واحداً.',
          steps: JSON.stringify([
            'افتح الصفحة الرئيسية لمنصة مساعد الإمام.',
            'شاهد قسم العدادات التنازلية مباشرة أسفل قسم الترحيب.',
            'ستجد عداداً مخصصاً يوضح الأيام والساعات المتبقية لنزول مكافأتك القادمة بدقة.',
            'في يوم نزول المكافأة، ستشاهد إشعاراً ترحيبياً خاصاً يخبرك بنزول المكافأة في حسابك.'
          ]),
          linkUrl: '/',
          linkTitle: 'الرئيسية (عداد المكافأة)'
        },
        {
          sectionId: secServices.id,
          title: 'كيف أستخرج بطاقتي الجامعية والمصرفية؟',
          description: 'خطوات إصدار البطاقة الجامعية الذكية لجامعة الإمام واستلام بطاقة الصراف الآلي للمكافآت.',
          text: 'البطاقة الجامعية ضرورية للدخول للحرم الجامعي وحضور الاختبارات والاستفادة من خدمات المكتبة المركزية، بينما بطاقة الصراف تمكنك من سحب مكافأتك الأكاديمية.',
          steps: JSON.stringify([
            'لالبطاقة الجامعية: قم برفع صورتك الشخصية والملف الشخصي عبر بوابة الخدمة الذاتية.',
            'بعد الموافقة الإلكترونية، توجه لعمادة شؤون الطلاب (مبنى 309 للطلاب) لاستلام البطاقة المطبوعة.',
            'لالبطاقة المصرفية: عند إصدار رقم الآيبان الأكاديمي، ستصلك رسالة نصية من مصرف الراجحي.',
            'توجه لفرع المصرف داخل المدينة الجامعية لاستلام بطاقة صراف الطلاب الخاصة بك وتفعيلها.'
          ]),
          linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
          linkTitle: 'رفع الصورة الشخصية (Banner)'
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
