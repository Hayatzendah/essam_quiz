/**
 * اختبار إنشاء attempt مباشرة (بدون Frontend)
 *
 * الاستخدام:
 * node test-attempt.js <examId> <accessToken>
 *
 * مثال:
 * node test-attempt.js 6926388f721cf4b2754587e7 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testAttempt(examId, accessToken) {
  try {
    console.log('\n🚀 اختبار إنشاء attempt...\n');
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);

    const response = await axios.post(
      `${BASE_URL}/attempts`,
      { examId, mode: 'exam' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log('✅ نجح! Attempt created successfully!\n');
    console.log('📋 Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ فشل! Error creating attempt\n');

    if (error.response) {
      console.error('📋 Error Response:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📋 No response received from server');
      console.error(`   Make sure backend is running on ${BASE_URL}`);
    } else {
      console.error('📋 Error:', error.message);
    }
  }
}

const examId = process.argv[2];
const accessToken = process.argv[3];

if (!examId || !accessToken) {
  console.error('❌ خطأ: يجب تحديد examId و accessToken');
  console.log('\nالاستخدام: node test-attempt.js <examId> <accessToken>');
  console.log('\nمثال:');
  console.log('node test-attempt.js 6926388f721cf4b2754587e7 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('\n💡 للحصول على accessToken:');
  console.log('1. افتح الموقع وسجلي دخول');
  console.log('2. افتح Developer Tools (F12)');
  console.log('3. اذهب إلى Application > Local Storage');
  console.log('4. انسخ قيمة "accessToken"');
  process.exit(1);
}

testAttempt(examId, accessToken);
