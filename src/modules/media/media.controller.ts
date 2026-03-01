import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaService } from './media.service';
import * as multer from 'multer';
import * as path from 'path';
import { diskStorage } from 'multer';
import { extname, join, basename, resolve } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import {
  audioFileFilter,
  getDefaultAudioExtension,
  isAllowedAudioFile,
} from '../../common/utils/audio-file-validator.util';

const storage = multer.memoryStorage();

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!/^audio\/|^image\/|^video\//.test(file.mimetype)) {
    return cb(new BadRequestException('Only audio/image/video files allowed') as any);
  }
  cb(null, true);
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('mock/*path')
  async getMockFile(@Param('path') path: string, @Req() req: any, @Res() res: Response) {
    // 🔥 استخراج الـ path من الـ URL مباشرة لتجنب مشاكل parsing
    // NestJS @Param('path') قد لا يعمل بشكل صحيح مع slashes متعددة وأحرف خاصة
    let cleanPath = '';

    // محاولة استخراج الـ path من req.originalUrl أو req.url
    const originalUrl = req.originalUrl || req.url || '';
    console.log(`[Mock Endpoint] Original URL: ${originalUrl}`);
    console.log(`[Mock Endpoint] Param path: ${JSON.stringify(path)}`);

    // استخراج الـ path من الـ URL بعد /media/mock/ - استخدام non-greedy match
    const match = originalUrl.match(/\/media\/mock\/(.+?)(?:\?|$)/);
    if (match && match[1]) {
      cleanPath = match[1];
      console.log(`[Mock Endpoint] Extracted from URL: ${cleanPath}`);
    } else {
      // Fallback: استخدام @Param إذا لم نجد في URL
      // لكن نحاول إصلاحه إذا كان فيه فواصل
      cleanPath = (path || '').replace(/,/g, '/');
      console.log(`[Mock Endpoint] Using param path: ${cleanPath}`);
    }

    // إزالة query parameters إذا كانت موجودة
    cleanPath = cleanPath.split('?')[0];
    console.log(`[Mock Endpoint] Path before decode: ${JSON.stringify(cleanPath)}`);

    try {
      // محاولة decode URI component - مهم جداً للأحرف الخاصة
      // قد يكون الـ path encoded مرتين، لذا نحاول decode مرتين
      let decoded = cleanPath;
      try {
        decoded = decodeURIComponent(cleanPath);
        // محاولة decode مرة ثانية إذا كان لا يزال encoded
        if (decoded.includes('%')) {
          decoded = decodeURIComponent(decoded);
        }
      } catch (e) {
        // إذا فشل، نستخدم القيمة الأصلية
        console.warn(`[Mock Endpoint] First decode failed, trying direct: ${e.message}`);
      }
      cleanPath = decoded;
      console.log(`[Mock Endpoint] Path after decode: ${JSON.stringify(cleanPath)}`);
    } catch (e) {
      // إذا فشل decode، نستخدم الـ path الأصلي
      console.warn(`[Mock Endpoint] Failed to decode path: ${cleanPath}, error: ${e.message}`);
    }

    // إصلاح أي فاصلة بدل slash (مشكلة شائعة في parsing)
    cleanPath = cleanPath.replace(/,/g, '/');

    // إزالة أي مسافات زائدة في البداية والنهاية
    cleanPath = cleanPath.trim();

    // إصلاح أي double slashes
    cleanPath = cleanPath.replace(/\/+/g, '/');

    // إزالة leading slash إذا كان موجوداً
    cleanPath = cleanPath.replace(/^\/+/, '');

    // Logging للتحقق من المسار
    console.log(`[Mock Endpoint] Cleaned path: ${JSON.stringify(cleanPath)}`);

    // 🔥 محاولة جلب الصورة الحقيقية من uploads folder أولاً
    // الـ path يأتي كـ "images/ولايات/..." أو "images/questions/..."
    const filePath = resolve(process.cwd(), 'uploads', cleanPath);

    console.log(`[Mock Endpoint] Resolved file path: ${filePath}`);
    console.log(`[Mock Endpoint] File exists: ${fs.existsSync(filePath)}`);

    // التحقق من وجود الملف محلياً
    if (fs.existsSync(filePath)) {
      try {
        // تحديد نوع الملف
        const ext = extname(cleanPath).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.m4a': 'audio/mp4',
          '.aac': 'audio/aac',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        console.log(`[Mock Endpoint] Serving file: ${filePath} with content-type: ${contentType}`);

        // إرجاع الملف الحقيقي
        return res.sendFile(filePath);
      } catch (error) {
        // في حالة خطأ، نرجع JSON
        console.error('[Mock Endpoint] Error serving file:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
          message: 'Error serving file',
          error: error.message,
          path: path,
          filePath: filePath,
        });
      }
    }

    // إذا لم يكن الملف موجوداً محلياً، نحاول استخدام الـ uploads endpoint
    // الـ path قد يكون "images/ولايات/..." نحتاج لاستخراج folder و filename
    const pathParts = cleanPath.split('/').filter((p) => p && p.trim().length > 0);
    console.log(`[Mock Endpoint] Path parts: ${JSON.stringify(pathParts)}`);

    if (pathParts.length >= 2 && pathParts[0] === 'images') {
      const folder = pathParts.slice(1, -1).join('/'); // كل شيء بين images و filename
      const filename = pathParts[pathParts.length - 1];

      console.log(`[Mock Endpoint] Extracted folder: ${JSON.stringify(folder)}`);
      console.log(`[Mock Endpoint] Extracted filename: ${JSON.stringify(filename)}`);

      // محاولة استخدام uploads controller endpoint
      const uploadsPath = resolve(process.cwd(), 'uploads', 'images', folder, filename);
      console.log(`[Mock Endpoint] Trying uploads path: ${uploadsPath}`);

      if (fs.existsSync(uploadsPath)) {
        try {
          const ext = extname(filename).toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
          };

          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          console.log(`[Mock Endpoint] Serving file from uploads: ${uploadsPath}`);
          return res.sendFile(uploadsPath);
        } catch (error) {
          console.error('[Mock Endpoint] Error serving file from uploads:', error);
        }
      }

      // 🔥 إذا لم يكن الملف موجوداً، نحاول البحث في جميع المجلدات الممكنة
      // لكن لا نعمل redirect لتجنب redirect loop
      const possiblePaths = [
        resolve(process.cwd(), 'uploads', 'images', folder, filename),
        resolve(process.cwd(), 'uploads', cleanPath),
        resolve(process.cwd(), 'uploads', 'images', cleanPath.replace(/^images\//, '')),
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          try {
            const ext = extname(filename).toLowerCase();
            const mimeTypes: { [key: string]: string } = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
            };
            const contentType = mimeTypes[ext] || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            console.log(`[Mock Endpoint] Found file at: ${possiblePath}`);
            return res.sendFile(possiblePath);
          } catch (error) {
            console.error(`[Mock Endpoint] Error serving from ${possiblePath}:`, error);
          }
        }
      }

      // 🔥 لا نعمل redirect هنا لتجنب redirect loop
      // بدلاً من ذلك، نرجع 404 أو رسالة Mock
      console.log(`[Mock Endpoint] File not found after checking all paths`);
    }

    // إذا لم يكن الملف موجوداً محلياً، نرجع رسالة Mock
    console.log(`[Mock Endpoint] File not found: ${filePath}`);
    console.log(`[Mock Endpoint] Attempted paths checked:`);
    console.log(`  - ${filePath}`);
    if (pathParts.length >= 2 && pathParts[0] === 'images') {
      const folder = pathParts.slice(1, -1).join('/');
      const filename = pathParts[pathParts.length - 1];
      console.log(`  - ${resolve(process.cwd(), 'uploads', 'images', folder, filename)}`);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      message: 'Mock mode: File not actually stored',
      note: 'This is a mock URL. In production with S3, this would return the actual file.',
      key: cleanPath,
      originalPath: cleanPath, // استخدام cleanPath بدلاً من path
      filePath: filePath,
      info: 'To get real file URLs, configure S3 environment variables in Railway, or ensure files exist in /uploads directory.',
    });
  }

  @Get('test')
  testPage(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Media Upload Test</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
    .endpoint { background: #f5f5f5; padding: 20px; margin: 15px 0; border-radius: 8px; }
    button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
    button:hover { background: #0056b3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    input[type="file"] { margin: 10px 0; }
    .result { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; white-space: pre-wrap; }
    .audio-controls { margin: 10px 0; }
    .recording { color: red; font-weight: bold; }
    .token-input { width: 100%; padding: 8px; margin: 10px 0; }
    h3 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>🎤 Media Upload Test Page</h1>
  
  <div class="endpoint">
    <h3>1. Authentication Token (مطلوب)</h3>
    <input type="text" id="authToken" class="token-input" placeholder="Enter JWT Token (from /auth/login)">
    <small>احصلي على التوكن من <a href="/auth/test" target="_blank">صفحة Auth</a></small>
  </div>

  <div class="endpoint">
    <h3>2. Upload Audio File (رفع ملف صوتي)</h3>
    <input type="file" id="fileInput" accept="audio/*,image/*,video/*">
    <button id="uploadBtn" type="button">Upload File</button>
    <div id="uploadResult" class="result"></div>
  </div>

  <div class="endpoint">
    <h3>3. Record Audio (تسجيل صوت مباشر)</h3>
    <div class="audio-controls">
      <button id="recordBtn" type="button">🎤 Start Recording</button>
      <button id="stopBtn" type="button" disabled>⏹ Stop Recording</button>
      <button id="playBtn" type="button" disabled>▶ Play</button>
      <span id="recordingStatus"></span>
    </div>
    <audio id="audioPlayback" controls style="width: 100%; margin-top: 10px;"></audio>
    <button id="uploadRecordedBtn" type="button" disabled style="margin-top: 10px;">Upload Recorded Audio</button>
    <div id="recordResult" class="result"></div>
  </div>

  <script>
    (function() {
      const API_BASE_URL = window.location.protocol + '//' + window.location.host;
      let mediaRecorder;
      let audioChunks = [];
      let recordedBlob = null;

      function showResult(elementId, message, isError = false) {
        const element = document.getElementById(elementId);
        const color = isError ? 'red' : 'green';
        element.style.color = color;
        element.textContent = message;
      }

      function getAuthHeader() {
        const token = document.getElementById('authToken').value;
        if (!token) {
          alert('Please enter authentication token first!');
          return null;
        }
        return { 'Authorization': 'Bearer ' + token };
      }

      // File Upload
      document.getElementById('uploadBtn').addEventListener('click', async function() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) {
          showResult('uploadResult', 'Please select a file', true);
          return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        const formData = new FormData();
        formData.append('file', file);

        showResult('uploadResult', 'Uploading...', false);

        try {
          const res = await fetch(API_BASE_URL + '/media/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });

          const data = await res.json();

          if (!res.ok) {
            showResult('uploadResult', 'Error ' + res.status + ': ' + JSON.stringify(data, null, 2), true);
          } else {
            showResult('uploadResult', 'Success! Copy this key to use in question:\n\n' + 
              JSON.stringify(data, null, 2) + 
              '\n\nUse this in question creation:\n' +
              JSON.stringify({ media: { type: 'audio', key: data.key, mime: data.mime } }, null, 2), false);
          }
        } catch (e) {
          showResult('uploadResult', 'Error: ' + e.message, true);
          console.error('Upload error:', e);
        }
      });

      // Audio Recording
      const recordBtn = document.getElementById('recordBtn');
      const stopBtn = document.getElementById('stopBtn');
      const playBtn = document.getElementById('playBtn');
      const uploadRecordedBtn = document.getElementById('uploadRecordedBtn');
      const audioPlayback = document.getElementById('audioPlayback');
      const recordingStatus = document.getElementById('recordingStatus');

      recordBtn.addEventListener('click', async function() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
          };

          mediaRecorder.onstop = function() {
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(recordedBlob);
            audioPlayback.src = audioUrl;
            playBtn.disabled = false;
            uploadRecordedBtn.disabled = false;
            recordingStatus.textContent = '';
          };

          mediaRecorder.start();
          recordBtn.disabled = true;
          stopBtn.disabled = false;
          recordingStatus.textContent = '🔴 Recording...';
          recordingStatus.className = 'recording';
        } catch (e) {
          showResult('recordResult', 'Error accessing microphone: ' + e.message, true);
        }
      });

      stopBtn.addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          recordBtn.disabled = false;
          stopBtn.disabled = true;
        }
      });

      playBtn.addEventListener('click', function() {
        audioPlayback.play();
      });

      uploadRecordedBtn.addEventListener('click', async function() {
        if (!recordedBlob) {
          showResult('recordResult', 'No recording available', true);
          return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        // Convert WebM to a File
        const file = new File([recordedBlob], 'recording.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);

        showResult('recordResult', 'Uploading recorded audio...', false);

        try {
          const res = await fetch(API_BASE_URL + '/media/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });

          const data = await res.json();

          if (!res.ok) {
            showResult('recordResult', 'Error ' + res.status + ': ' + JSON.stringify(data, null, 2), true);
          } else {
            showResult('recordResult', 'Success! Copy this key to use in question:\n\n' + 
              JSON.stringify(data, null, 2) + 
              '\n\nUse this in question creation:\n' +
              JSON.stringify({ media: { type: 'audio', key: data.key, mime: data.mime } }, null, 2), false);
          }
        } catch (e) {
          showResult('recordResult', 'Error: ' + e.message, true);
          console.error('Upload error:', e);
        }
      });
    })();
  </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file');
    const ext = path.extname(file.originalname).replace(/^\./, '').toLowerCase();
    const saved = await this.media.uploadBuffer({
      buffer: file.buffer,
      mime: file.mimetype,
      ext,
      prefix: 'questions',
    });
    // من الأفضل حفظ الـ key في السؤال لاحقًا
    return { key: saved.key, mime: saved.mime, url: saved.url, private: true };
  }

  // للطلاب: رفع تسجيل صوتي (Sprechen)
  @Post('upload/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: (req, file, cb) => {
        // للطلاب: فقط ملفات صوتية مدعومة (بدون OPUS)
        if (!/^audio\//.test(file.mimetype)) {
          return cb(
            new BadRequestException('Only audio files allowed for student uploads') as any,
            false,
          );
        }
        // التحقق من أن الصيغة مدعومة (رفض OPUS)
        if (!isAllowedAudioFile(file)) {
          return cb(
            new BadRequestException(
              'OPUS format is not supported. Please use MP3, M4A, WAV, or AAC format for better browser compatibility.',
            ) as any,
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB للطلاب
    }),
  )
  async uploadStudentAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file');
    const ext = path.extname(file.originalname).replace(/^\./, '').toLowerCase();
    const saved = await this.media.uploadBuffer({
      buffer: file.buffer,
      mime: file.mimetype,
      ext,
      prefix: 'student-recordings', // مجلد منفصل لتسجيلات الطلاب
    });
    return { key: saved.key, mime: saved.mime, url: saved.url, private: true };
  }

  // للمعلمين: رفع ملف صوتي مباشرة إلى uploads/audio (لأسئلة الاستماع)
  @Post('audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || getDefaultAudioExtension();
          cb(null, `listening-${timestamp}-${random}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: audioFileFilter,
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    console.log('Saved audio file at', file.path);

    const key = `/uploads/audio/${file.filename}`;
    return {
      type: 'audio',
      key,
      url: key,
      mime: file.mimetype,
    };
  }
}
