import * as fs from 'fs';
import * as path from 'path';

interface Question {
  prompt: string;
  qType: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  provider?: string;
  mainSkill?: string;
  usageCategory?: string;
  state?: string;
  level?: string;
  status?: string;
  tags?: string[];
  media?: {
    type: string;
    key: string;
    url: string;
    mime: string;
    provider: string;
    description?: string;
  };
  images?: Array<{
    type: string;
    key: string;
    url: string;
    mime: string;
    provider: string;
    description?: string;
  }>;
}

interface QuestionsData {
  questions: Question[];
}

/**
 * يضيف وصف (description) لكل صورة في مصفوفة images بناءً على نص الخيارات
 * إذا كان الخيار يحتوي على "Bild 1", "Bild 2", إلخ، يتم إضافة نفس النص كوصف للصورة المقابلة
 */
async function addImageDescriptionsToStateQuestions() {
  try {
    const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-state-questions.json');
    console.log(`📖 Reading questions from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: QuestionsData = JSON.parse(fileContent);

    console.log(`📊 Found ${data.questions.length} questions in file\n`);

    let updatedCount = 0;

    // تحديث الأسئلة
    for (let i = 0; i < data.questions.length; i++) {
      const questionNumber = i + 1; // رقم السؤال (1-based)
      const question = data.questions[i];

      // التحقق من وجود options و images
      if (question.options && question.images && question.images.length > 0) {
        // البحث عن الخيارات التي تبدأ بـ "Bild"
        const bildOptions = question.options.filter(opt => 
          opt.text && opt.text.trim().toLowerCase().startsWith('bild')
        );

        // إذا وجدنا خيارات "Bild" وعددها يطابق عدد الصور
        if (bildOptions.length > 0 && bildOptions.length === question.images.length) {
          // ترتيب الخيارات حسب النص (Bild 1, Bild 2, ...)
          const sortedOptions = [...bildOptions].sort((a, b) => {
            const numA = parseInt(a.text.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.text.match(/\d+/)?.[0] || '0');
            return numA - numB;
          });

          // إضافة الوصف لكل صورة
          let hasUpdates = false;
          for (let j = 0; j < question.images.length && j < sortedOptions.length; j++) {
            if (!question.images[j].description) {
              question.images[j].description = sortedOptions[j].text.trim();
              hasUpdates = true;
            }
          }

          // أيضاً تحديث media إذا كان موجوداً وليس له وصف
          if (question.media && !question.media.description && question.images.length > 0) {
            question.media.description = question.images[0].description;
            hasUpdates = true;
          }

          if (hasUpdates) {
            const stateInfo = question.state ? ` (${question.state})` : '';
            console.log(`✅ Added descriptions to question ${questionNumber}${stateInfo}: ${sortedOptions.map(o => o.text).join(', ')}`);
            updatedCount++;
          }
        }
      }
    }

    // حفظ الملف المحدث
    const updatedContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(jsonPath, updatedContent, 'utf-8');

    console.log(`\n✅ Successfully updated ${updatedCount} questions with image descriptions`);
    console.log(`📝 File saved: ${jsonPath}`);

  } catch (error) {
    console.error('❌ Error adding image descriptions:', error);
    throw error;
  }
}

// تشغيل السكريبت
if (require.main === module) {
  addImageDescriptionsToStateQuestions()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { addImageDescriptionsToStateQuestions };

