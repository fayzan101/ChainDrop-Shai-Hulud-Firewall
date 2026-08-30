import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ulid } from "ulid";
import { CreateScanDto } from "../dto/api.dto";
import { ScanEntity } from "../entities/scan.entity";
import { VerdictEntity } from "../entities/verdict.entity";
import { serializeVerdict } from "../serialization";

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(ScanEntity)
    private readonly scans: Repository<ScanEntity>,
    @InjectRepository(VerdictEntity)
    private readonly verdicts: Repository<VerdictEntity>,
  ) {}

  async create(dto: CreateScanDto) {
    const existing = await this.scans.findOne({
      where: {
        run_id: dto.run_id,
        lockfile_digest: dto.lockfile_digest,
      },
      relations: { verdicts: { feedback: true } },
    });

    if (existing) {
      return {
        scan_id: existing.id,
        verdicts: existing.verdicts.map(serializeVerdict),
        idempotent: true,
      };
    }

    const scan = this.scans.create({
      repo: dto.repo,
      sha: dto.sha,
      run_id: dto.run_id,
      lockfile_digest: dto.lockfile_digest,
      scan_payload: dto.scan_payload ?? null,
    });
    await this.scans.save(scan);

    const verdictRows = dto.verdicts.map((input) =>
      this.verdicts.create({
        verdict_id: ulid(),
        scan_id: scan.id,
        repo: input.repo,
        sha: input.sha,
        run_id: input.run_id,
        package: input.package,
        version: input.version,
        hook: input.hook,
        script_sha256: input.script_sha256,
        risk_score: input.risk_score,
        action: input.action,
        attack_techniques: input.attack_techniques,
        matched_campaigns: input.matched_campaigns,
        justification: input.justification,
        citations: input.citations,
        uncertainty: input.uncertainty,
        reasoner_status: input.reasoner_status,
        model_version: input.model_version ?? null,
        feature_schema_version: input.feature_schema_version ?? null,
        corpus_version: input.corpus_version ?? null,
        prompt_version: input.prompt_version ?? null,
        classifier_label: input.classifier_label ?? null,
        sandbox: input.sandbox ?? null,
        degraded: input.degraded,
        split: input.split ?? dto.split ?? null,
      }),
    );
    await this.verdicts.save(verdictRows);

    return {
      scan_id: scan.id,
      verdicts: verdictRows.map(serializeVerdict),
      idempotent: false,
    };
  }

  async findOne(scanId: string) {
    const scan = await this.scans.findOne({
      where: { id: scanId },
      relations: { verdicts: { feedback: true } },
    });
    if (!scan) {
      throw new NotFoundException(`Scan ${scanId} not found`);
    }
    return {
      scan_id: scan.id,
      repo: scan.repo,
      sha: scan.sha,
      run_id: scan.run_id,
      lockfile_digest: scan.lockfile_digest,
      created_at: scan.created_at.toISOString(),
      verdicts: scan.verdicts.map(serializeVerdict),
    };
  }

  assertNotFinalized(scan: ScanEntity | null) {
    if (!scan) {
      return;
    }
    throw new ConflictException("Scan already finalized");
  }
}
