import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('health')
export class HealthController {
  private getCommitSha(): string {
    try {
      // Try to get from environment variable first (set during build/deploy)
      if (process.env.COMMIT_SHA) {
        return process.env.COMMIT_SHA;
      }
      // Try to get from git
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      } catch {
        // If git is not available, try to read from .git/HEAD
        try {
          const headPath = join(process.cwd(), '.git', 'HEAD');
          const headContent = readFileSync(headPath, 'utf-8').trim();
          if (headContent.startsWith('ref:')) {
            const refPath = join(process.cwd(), '.git', headContent.substring(5));
            return readFileSync(refPath, 'utf-8').trim();
          }
          return headContent;
        } catch {
          return 'unknown';
        }
      }
    } catch {
      return 'unknown';
    }
  }

  private getBuildTime(): string {
    try {
      // Try to get from environment variable first (set during build/deploy)
      if (process.env.BUILD_TIME) {
        return process.env.BUILD_TIME;
      }
      // Try to get from package.json or build timestamp
      try {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
        return packageJson.buildTime || new Date().toISOString();
      } catch {
        return new Date().toISOString();
      }
    } catch {
      return new Date().toISOString();
    }
  }

  @Get()
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('version')
  version() {
    return {
      commitSha: this.getCommitSha(),
      buildTime: this.getBuildTime(),
      timestamp: new Date().toISOString(),
    };
  }
}
