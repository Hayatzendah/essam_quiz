const fs = require('fs');
const path = require('path');

// إعدادات - يمكنك تعديلها
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.deutsch-tests.com';
const JWT_TOKEN = process.env.JWT_TOKEN; // يجب تعيين JWT token

// مجلدات الصور
const STATES_IMAGES_DIR = path.join(__dirname, 'uploads', 'images', 'ولايات');

async function uploadImage(imagePath, filename) {
  try {
    // قراءة الملف وتحويله إلى base64
    const fileBuffer = fs.readFileSync(imagePath);
    const base64 = fileBuffer.toString('base64');

    const endpoint = `${API_BASE_URL}/uploads/image-from-base64?folder=ولايات`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        filename: filename,
        base64: base64,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Uploaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    return false;
  }
}

async function uploadAllStateImages() {
  if (!JWT_TOKEN) {
    console.error('❌ JWT_TOKEN environment variable is required!');
    console.log('\nUsage:');
    console.log('  JWT_TOKEN=your_token node upload-states-quick.js');
    console.log('\nTo get JWT token:');
    console.log('  1. Login to https://api.deutsch-tests.com/auth/login');
    console.log('  2. Copy the accessToken from response');
    console.log('  3. Run: JWT_TOKEN=your_token node upload-states-quick.js');
    process.exit(1);
  }

  console.log('🚀 Starting state images upload...\n');

  if (!fs.existsSync(STATES_IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${STATES_IMAGES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(STATES_IMAGES_DIR);
  const imageFiles = files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));
  
  console.log(`📁 Found ${imageFiles.length} images to upload\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(STATES_IMAGES_DIR, file);
    console.log(`[${i + 1}/${imageFiles.length}] Uploading ${file}...`);
    const success = await uploadImage(filePath, file);
    if (success) successCount++;
    else failCount++;
    // تأخير صغير لتجنب rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n✅ Upload completed!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

uploadAllStateImages().catch(console.error);

