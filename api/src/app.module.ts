import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CorpusController } from "./corpus/corpus.controller";
import { CorpusService } from "./corpus/corpus.service";
import { DatabaseModule } from "./database.module";
import { FeedbackEntity } from "./entities/feedback.entity";
import { ScanEntity } from "./entities/scan.entity";
import { VerdictEntity } from "./entities/verdict.entity";
import { MetricsController } from "./metrics/metrics.controller";
import { ScansController } from "./scans/scans.controller";
import { ScansService } from "./scans/scans.service";
import { VerdictsController } from "./verdicts/verdicts.controller";
import { VerdictsService } from "./verdicts/verdicts.service";

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([ScanEntity, VerdictEntity, FeedbackEntity]),
  ],
  controllers: [
    ScansController,
    VerdictsController,
    CorpusController,
    MetricsController,
  ],
  providers: [ScansService, VerdictsService, CorpusService],
})
export class AppModule {}
