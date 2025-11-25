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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaService } from './media.service';
import * as multer from 'multer';
import * as path from 'path';
import type { Response } from 'express';

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
  async getMockFile(@Param('path') path: string, @Res() res: Response) {
    // في وضع Mock، نعيد رسالة توضيحية بدل الملف الفعلي
    // لأن الملفات لا تُحفظ فعلياً في وضع Mock
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      message: 'Mock mode: File not actually stored',
      note: 'This is a mock URL. In production with S3, this would return the actual file.',
      key: path,
      info: 'To get real file URLs, configure S3 environment variables in Railway.',
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
        // للطلاب: فقط ملفات صوتية
        if (!/^audio\//.test(file.mimetype)) {
          return cb(
            new BadRequestException('Only audio files allowed for student uploads') as any,
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
}
