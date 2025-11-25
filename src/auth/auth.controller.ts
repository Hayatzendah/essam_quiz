import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserRole } from '../common/enums';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('test')
  testPage(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Auth API Test</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    button:hover { background: #0056b3; }
    input { padding: 8px; margin: 5px; width: 200px; }
    .result { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Auth API Test Page</h1>
  
  <div class="endpoint">
    <h3>Register</h3>
    <input type="email" id="regEmail" placeholder="Email" value="test@example.com">
    <input type="password" id="regPassword" placeholder="Password" value="12345678">
    <button id="registerBtn" type="button">Register</button>
  </div>

  <div class="endpoint">
    <h3>Login</h3>
    <input type="email" id="loginEmail" placeholder="Email" value="test@example.com">
    <input type="password" id="loginPassword" placeholder="Password" value="12345678">
    <button id="loginBtn" type="button">Login</button>
  </div>

  <div class="endpoint">
    <h3>Refresh Token</h3>
    <input type="text" id="refreshToken" placeholder="Refresh Token">
    <button id="refreshBtn" type="button">Refresh</button>
  </div>

  <div class="result" id="result"></div>

  <script>
    (function() {
      const API_BASE_URL = window.location.protocol + '//' + window.location.host;
      const resultDiv = document.getElementById('result');
      
      function showResult(message, isError = false) {
        const color = isError ? 'red' : 'green';
        resultDiv.innerHTML = '<pre style="color: ' + color + ';">' + message + '</pre>';
      }
      
      async function register() {
        try {
          const email = document.getElementById('regEmail').value;
          const password = document.getElementById('regPassword').value;
          
          if (!email || !password) {
            showResult('Please fill in all fields', true);
            return;
          }
          
          showResult('Loading...', false);
          
          const res = await fetch(API_BASE_URL + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            showResult('Error ' + res.status + ': ' + JSON.stringify(data, null, 2), true);
          } else {
            showResult('Success: ' + JSON.stringify(data, null, 2), false);
          }
        } catch (e) {
          showResult('Error: ' + e.message, true);
          console.error('Register error:', e);
        }
      }

      async function login() {
        try {
          const email = document.getElementById('loginEmail').value;
          const password = document.getElementById('loginPassword').value;
          
          if (!email || !password) {
            showResult('Please fill in all fields', true);
            return;
          }
          
          showResult('Loading...', false);
          
          const res = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            showResult('Error ' + res.status + ': ' + JSON.stringify(data, null, 2), true);
          } else {
            showResult('Success: ' + JSON.stringify(data, null, 2), false);
            if (data.refreshToken) {
              document.getElementById('refreshToken').value = data.refreshToken;
            }
          }
        } catch (e) {
          showResult('Error: ' + e.message, true);
          console.error('Login error:', e);
        }
      }

      async function refresh() {
        try {
          const refreshToken = document.getElementById('refreshToken').value;
          
          if (!refreshToken) {
            showResult('Please enter a refresh token', true);
            return;
          }
          
          showResult('Loading...', false);
          
          const res = await fetch(API_BASE_URL + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            showResult('Error ' + res.status + ': ' + JSON.stringify(data, null, 2), true);
          } else {
            showResult('Success: ' + JSON.stringify(data, null, 2), false);
          }
        } catch (e) {
          showResult('Error: ' + e.message, true);
          console.error('Refresh error:', e);
        }
      }
      
      // Add event listeners when DOM is ready
      function attachListeners() {
        document.getElementById('registerBtn').addEventListener('click', register);
        document.getElementById('loginBtn').addEventListener('click', login);
        document.getElementById('refreshBtn').addEventListener('click', refresh);
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachListeners);
      } else {
        attachListeners();
      }
    })();
  </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get()
  apiInfo() {
    const baseUrl = process.env.CORS_ORIGIN || 'https://api.deutsch-tests.com';
    return {
      message: 'Auth API Endpoints',
      baseUrl,
      endpoints: {
        register: {
          method: 'POST',
          url: `${baseUrl}/auth/register`,
          path: '/auth/register',
          body: { email: 'string', password: 'string', role: 'student|teacher|admin (optional)' },
        },
        login: {
          method: 'POST',
          url: `${baseUrl}/auth/login`,
          path: '/auth/login',
          body: { email: 'string', password: 'string' },
        },
        refresh: {
          method: 'POST',
          url: `${baseUrl}/auth/refresh`,
          path: '/auth/refresh',
          body: { refreshToken: 'string' },
        },
        logout: { method: 'POST', url: `${baseUrl}/auth/logout`, path: '/auth/logout' },
      },
    };
  }

  @Get('debug/users')
  async debugUsers() {
    return this.auth.debugUsers();
  }

  @Get('debug/user/:email')
  async debugUser(@Param('email') email: string) {
    return this.auth.debugUser(email);
  }

  @Get('check/:email')
  async checkUser(@Param('email') email: string) {
    return this.auth.checkUser(email);
  }

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@CurrentUser('userId') userId: string) {
    return this.auth.logout(userId);
  }

  @ApiOperation({ summary: 'Get current user information' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Returns current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser('userId') userId: string) {
    return this.auth.getMe(userId);
  }

  @ApiOperation({ summary: 'Check teacher account status (for debugging)' })
  @ApiResponse({ status: 200, description: 'Returns teacher account status' })
  @Get('check-teacher')
  async checkTeacher() {
    const teacherEmail = process.env.TEACHER_EMAIL || 'not-set';
    const teacherPasswordSet = !!process.env.TEACHER_PASSWORD;
    const teacherPasswordLength = process.env.TEACHER_PASSWORD?.length || 0;

    // محاولة البحث عن المستخدم في الداتابيس
    let userExists = false;
    let userRole: UserRole | null = null;
    try {
      const user = await this.auth['users'].findByEmail(teacherEmail);
      if (user) {
        userExists = true;
        userRole = user.role;
      }
    } catch (error) {
      // ignore
    }

    return {
      teacherEmail,
      teacherPasswordSet,
      teacherPasswordLength,
      userExists,
      userRole,
      message: userExists
        ? userRole === 'teacher'
          ? 'Teacher account exists and is ready'
          : `User exists but role is '${userRole}' instead of 'teacher'`
        : 'Teacher account does not exist in database. Please register first.',
    };
  }
}
