import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { FeedbackEntity } from "./entities/feedback.entity";
import { ScanEntity } from "./entities/scan.entity";
import { VerdictEntity } from "./entities/verdict.entity";

export function databaseConfig(): TypeOrmModuleOptions {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres")) {
    return {
      type: "postgres",
      url,
      entities: [ScanEntity, VerdictEntity, FeedbackEntity],
      synchronize: process.env.NODE_ENV !== "production",
    };
  }

  return {
    type: "better-sqlite3",
    database: process.env.SQLITE_PATH || ":memory:",
    entities: [ScanEntity, VerdictEntity, FeedbackEntity],
    synchronize: true,
  };
}

export const DatabaseModule = TypeOrmModule.forRoot(databaseConfig());
