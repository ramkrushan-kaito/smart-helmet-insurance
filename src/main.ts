import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  if (process.env.NODE_ENV === 'production') {
    const client = join(__dirname, 'client');
    if (existsSync(client)) {
      app.useStaticAssets(client);
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
        res.sendFile(join(client, 'index.html'));
      });
    } else {
      Logger.warn('React build was not found in dist/client. API routes still work.');
    }
  } else {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/scan' || req.path.startsWith('/scan/')) {
        return res.redirect(302, `${frontend}${req.originalUrl}`);
      }
      next();
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API http://localhost:${port}/api`);
  Logger.log(`Swagger http://localhost:${port}/api/docs`);
}

bootstrap();
