import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
}

if (require.main === module) {
  bootstrap();
}
