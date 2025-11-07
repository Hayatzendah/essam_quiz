import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

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
    <button onclick="register()">Register</button>
  </div>

  <div class="endpoint">
    <h3>Login</h3>
    <input type="email" id="loginEmail" placeholder="Email" value="test@example.com">
    <input type="password" id="loginPassword" placeholder="Password" value="12345678">
    <button onclick="login()">Login</button>
  </div>

  <div class="endpoint">
    <h3>Refresh Token</h3>
    <input type="text" id="refreshToken" placeholder="Refresh Token">
    <button onclick="refresh()">Refresh</button>
  </div>

  <div class="result" id="result"></div>

  <script>
    async function register() {
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        document.getElementById('result').innerHTML = '<pre>Error: ' + e.message + '</pre>';
      }
    }

    async function login() {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        if (data.refreshToken) {
          document.getElementById('refreshToken').value = data.refreshToken;
        }
      } catch (e) {
        document.getElementById('result').innerHTML = '<pre>Error: ' + e.message + '</pre>';
      }
    }

    async function refresh() {
      const refreshToken = document.getElementById('refreshToken').value;
      try {
        const res = await fetch('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const data = await res.json();
        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        document.getElementById('result').innerHTML = '<pre>Error: ' + e.message + '</pre>';
      }
    }
  </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get()
  apiInfo() {
    return {
      message: 'Auth API Endpoints',
      endpoints: {
        register: { method: 'POST', path: '/auth/register', body: { email: 'string', password: 'string', role: 'student|teacher|admin (optional)' } },
        login: { method: 'POST', path: '/auth/login', body: { email: 'string', password: 'string' } },
        refresh: { method: 'POST', path: '/auth/refresh', body: { refreshToken: 'string' } },
        logout: { method: 'POST', path: '/auth/logout' },
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

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout() {
    return this.auth.logout();
  }
}

