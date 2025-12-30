import * as fs from 'fs';
import * as path from 'path';

interface Question {
  prompt: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  images?: Array<{ description?: string }>;
}

interface QuestionsData {
  questions: Question[];
}

async function check4ImagesQuestions() {
  const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const data: QuestionsData = JSON.parse(fileContent);

  const questionsWith4Images = data.questions
    .map((q, idx) => ({ question: q, index: idx + 1 }))
    .filter(({ question }) => question.images && question.images.length === 4);

  console.log(`\n📊 Total questions with 4 images: ${questionsWith4Images.length}\n`);

  questionsWith4Images.forEach(({ question, index }) => {
    const hasBild = question.options?.some(o => 
      o.text && o.text.trim().toLowerCase().startsWith('bild')
    ) || false;
    
    const hasDescriptions = question.images?.every(img => img.description) || false;
    const allDescriptions = question.images?.map(img => img.description || 'NO DESC').join(', ') || 'N/A';
    
    console.log(`Q${index}: ${question.prompt.substring(0, 60)}...`);
    console.log(`   Has Bild options: ${hasBild ? '✅' : '❌'}`);
    console.log(`   Has descriptions: ${hasDescriptions ? '✅' : '❌'}`);
    console.log(`   Descriptions: ${allDescriptions}`);
    console.log('');
  });
}

if (require.main === module) {
  check4ImagesQuestions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { check4ImagesQuestions };

