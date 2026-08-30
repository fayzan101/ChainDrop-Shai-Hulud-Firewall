import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CitationDto } from "./api.dto";

export class FeedbackResponseDto {
  @ApiProperty({
    enum: ["confirm-malicious", "false-positive", "needs-more-data"],
  })
  label!: string;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiProperty()
  analyst!: string;

  @ApiProperty({ format: "date-time" })
  created_at!: string;
}

export class VerdictResponseDto {
  @ApiProperty({ example: "01JABCDEFGHJKMNPQRSTVWXYZ0" })
  verdict_id!: string;

  @ApiProperty({ format: "date-time" })
  created_at!: string;

  @ApiProperty()
  repo!: string;

  @ApiProperty()
  sha!: string;

  @ApiProperty()
  run_id!: string;

  @ApiProperty()
  package!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  hook!: string;

  @ApiProperty()
  script_sha256!: string;

  @ApiProperty()
  risk_score!: number;

  @ApiProperty({ enum: ["allow", "quarantine", "block"] })
  action!: string;

  @ApiProperty({ type: [String] })
  attack_techniques!: string[];

  @ApiProperty({ type: [String] })
  matched_campaigns!: string[];

  @ApiProperty()
  justification!: string;

  @ApiProperty({ type: [CitationDto] })
  citations!: CitationDto[];

  @ApiProperty()
  uncertainty!: string;

  @ApiProperty({ enum: ["ok", "degraded", "skipped"] })
  reasoner_status!: string;

  @ApiPropertyOptional({ nullable: true })
  model_version!: string | null;

  @ApiPropertyOptional({ nullable: true })
  feature_schema_version!: string | null;

  @ApiPropertyOptional({ nullable: true })
  corpus_version!: string | null;

  @ApiPropertyOptional({ nullable: true })
  prompt_version!: string | null;

  @ApiPropertyOptional({ nullable: true })
  classifier_label!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sandbox!: Record<string, unknown> | null;

  @ApiProperty()
  degraded!: boolean;

  @ApiPropertyOptional({ enum: ["train", "val", "heldout"], nullable: true })
  split!: string | null;

  @ApiPropertyOptional({ type: FeedbackResponseDto, nullable: true })
  feedback!: FeedbackResponseDto | null;
}

export class CreateScanResponseDto {
  @ApiProperty({ format: "uuid" })
  scan_id!: string;

  @ApiProperty({ type: [VerdictResponseDto] })
  verdicts!: VerdictResponseDto[];

  @ApiPropertyOptional({
    description: "True when an existing scan was returned for run_id + lockfile_digest.",
  })
  idempotent?: boolean;
}

export class ScanDetailResponseDto {
  @ApiProperty({ format: "uuid" })
  scan_id!: string;

  @ApiProperty()
  repo!: string;

  @ApiProperty()
  sha!: string;

  @ApiProperty()
  run_id!: string;

  @ApiProperty()
  lockfile_digest!: string;

  @ApiProperty({ format: "date-time" })
  created_at!: string;

  @ApiProperty({ type: [VerdictResponseDto] })
  verdicts!: VerdictResponseDto[];
}

export class VerdictListResponseDto {
  @ApiProperty({ type: [VerdictResponseDto] })
  items!: VerdictResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  next_cursor!: string | null;
}

export class FeedbackResultDto {
  @ApiProperty({ type: VerdictResponseDto })
  verdict!: VerdictResponseDto;

  @ApiProperty({ type: FeedbackResponseDto })
  feedback!: FeedbackResponseDto;

  @ApiProperty({
    description: "True when the verdict split was heldout and remained unchanged.",
  })
  heldout_split_preserved!: boolean;
}

export class CorpusHealthResponseDto {
  @ApiProperty({ example: "no-chaindrop" })
  corpus_version!: string;

  @ApiProperty({ example: 4 })
  document_count!: number;

  @ApiProperty({
    example: 0,
    description: "Must be 0 for the evaluation corpus pin.",
  })
  chaindrop_documents!: number;

  @ApiProperty({ format: "date-time" })
  embedded_at!: string;

  @ApiPropertyOptional({
    description: "Present when Python rag.health is unavailable.",
  })
  degraded?: boolean;
}

export class MetricsResponseDto {
  @ApiProperty()
  scans_total!: number;

  @ApiProperty()
  blocks_total!: number;

  @ApiProperty()
  quarantines_total!: number;

  @ApiProperty()
  escalations_total!: number;

  @ApiProperty({ description: "blocks_total / scans_total" })
  block_rate!: number;
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string | string[];

  @ApiProperty()
  error!: string;
}
