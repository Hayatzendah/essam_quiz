import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.resolve(process.cwd(), 'questions', 'leben-in-deutschland-300-questions.json');
const fileContent = fs.readFileSync(jsonPath, 'utf-8');
const data = JSON.parse(fileContent);

console.log('🔍 Checking image positions...\n');

const imageMappings = [
  { key: 'سؤال21عام', expectedQuestion: 21 },
  { key: 'سؤال55عام', expectedQuestion: 55 },
  { key: 'سؤال70عام', expectedQuestion: 70 },
  { key: 'سؤال130عام', expectedQuestion: 130 },
  { key: 'سؤال176عام', expectedQuestion: 176 },
  { key: 'سؤال181عام', expectedQuestion: 181 },
  { key: 'سؤال187عام', expectedQuestion: 187 },
  { key: 'سؤال209عام', expectedQuestion: 209 },
  { key: 'سؤال216عام', expectedQuestion: 216 },
  { key: 'سؤال226عام', expectedQuestion: 226 },
  { key: 'سؤال235عام', expectedQuestion: 235 },
];

for (const mapping of imageMappings) {
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    const questionNum = i + 1;
    
    const hasMedia = q.media && q.media.key && q.media.key.includes(mapping.key);
    const hasImages = q.images && Array.isArray(q.images) && q.images.length > 0 &&
                      q.images.some((img: any) => img.key && img.key.includes(mapping.key));
    
    if (hasMedia || hasImages) {
      const status = questionNum === mapping.expectedQuestion ? '✅' : '❌';
      console.log(`${status} ${mapping.key}: Found in question ${questionNum}, expected in question ${mapping.expectedQuestion}`);
      console.log(`   Question: "${q.prompt.substring(0, 60)}..."`);
      
      if (questionNum !== mapping.expectedQuestion) {
        console.log(`   ⚠️  Should be moved to question ${mapping.expectedQuestion}`);
      }
      console.log('');
    }
  }
}

