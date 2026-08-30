import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CitationDto {
  @ApiProperty({ example: "ti-shulud2-001" })
  @IsString()
  doc_id!: string;

  @ApiProperty({ example: "Shai-Hulud 2.0 credential theft" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    example:
      "https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  url?: string | null;

  @ApiPropertyOptional({ example: "2025-11-24", nullable: true })
  @IsOptional()
  @IsString()
  date?: string | null;
}

export class VerdictInputDto {
  @ApiProperty({ example: "acme/app" })
  @IsString()
  @IsNotEmpty()
  repo!: string;

  @ApiProperty({ example: "abc123def456" })
  @IsString()
  @IsNotEmpty()
  sha!: string;

  @ApiProperty({ example: "12345678901" })
  @IsString()
  @IsNotEmpty()
  run_id!: string;

  @ApiProperty({ example: "@scope/name" })
  @IsString()
  @IsNotEmpty()
  package!: string;

  @ApiProperty({ example: "1.2.3" })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ enum: ["preinstall", "install", "postinstall"] })
  @IsIn(["preinstall", "install", "postinstall"])
  hook!: "preinstall" | "install" | "postinstall";

  @ApiProperty({
    example: "a".repeat(64),
    description: "SHA-256 of captured script bytes (hex).",
  })
  @IsString()
  script_sha256!: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 87 })
  @IsInt()
  @Min(0)
  @Max(100)
  risk_score!: number;

  @ApiProperty({ enum: ["allow", "quarantine", "block"] })
  @IsIn(["allow", "quarantine", "block"])
  action!: "allow" | "quarantine" | "block";

  @ApiProperty({ type: [String], example: ["T1195.002", "T1528"] })
  @IsArray()
  @IsString({ each: true })
  attack_techniques!: string[];

  @ApiProperty({ type: [String], example: ["shai-hulud-2.0"] })
  @IsArray()
  @IsString({ each: true })
  matched_campaigns!: string[];

  @ApiProperty({
    example:
      "Behavior summary matches documented preinstall loader and credential harvest.",
  })
  @IsString()
  justification!: string;

  @ApiProperty({ type: [CitationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationDto)
  citations!: CitationDto[];

  @ApiProperty({ enum: ["low", "medium", "high"] })
  @IsIn(["low", "medium", "high"])
  uncertainty!: "low" | "medium" | "high";

  @ApiProperty({ enum: ["ok", "degraded", "skipped"] })
  @IsIn(["ok", "degraded", "skipped"])
  reasoner_status!: "ok" | "degraded" | "skipped";

  @ApiPropertyOptional({ example: "features-heuristic-0.1.0", nullable: true })
  @IsOptional()
  @IsString()
  model_version?: string | null;

  @ApiPropertyOptional({ example: "1.0.0", nullable: true })
  @IsOptional()
  @IsString()
  feature_schema_version?: string | null;

  @ApiPropertyOptional({ example: "no-chaindrop", nullable: true })
  @IsOptional()
  @IsString()
  corpus_version?: string | null;

  @ApiPropertyOptional({ example: "verdict-fixture-0.1.0", nullable: true })
  @IsOptional()
  @IsString()
  prompt_version?: string | null;

  @ApiPropertyOptional({
    enum: ["benign", "suspicious", "escalate"],
    nullable: true,
  })
  @IsOptional()
  @IsString()
  classifier_label?: string | null;

  @ApiPropertyOptional({
    example: { timeout: false, canary_hits: ["npm_token"], egress_count: 3 },
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  sandbox?: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  degraded!: boolean;

  @ApiPropertyOptional({
    enum: ["train", "val", "heldout"],
    nullable: true,
    description: "Dataset split; held-out rows must not be relabeled via UI.",
  })
  @IsOptional()
  @IsIn(["train", "val", "heldout"])
  split?: "train" | "val" | "heldout" | null;
}

export class CreateScanDto {
  @ApiProperty({ example: "acme/app" })
  @IsString()
  repo!: string;

  @ApiProperty({ example: "abc123def456" })
  @IsString()
  sha!: string;

  @ApiProperty({ example: "12345678901" })
  @IsString()
  run_id!: string;

  @ApiProperty({
    example: "package-lock.json",
    description: "Lockfile path or digest for idempotency with run_id.",
  })
  @IsString()
  lockfile_digest!: string;

  @ApiPropertyOptional({
    enum: ["train", "val", "heldout"],
    nullable: true,
  })
  @IsOptional()
  @IsIn(["train", "val", "heldout"])
  split?: "train" | "val" | "heldout" | null;

  @ApiPropertyOptional({
    description: "Raw scan output from action/scan.mjs or scan-rag.mjs.",
  })
  @IsOptional()
  @IsObject()
  scan_payload?: Record<string, unknown>;

  @ApiProperty({ type: [VerdictInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerdictInputDto)
  verdicts!: VerdictInputDto[];
}

export class FeedbackDto {
  @ApiProperty({
    enum: ["confirm-malicious", "false-positive", "needs-more-data"],
  })
  @IsIn(["confirm-malicious", "false-positive", "needs-more-data"])
  label!: "confirm-malicious" | "false-positive" | "needs-more-data";

  @ApiPropertyOptional({ example: "Legitimate esbuild download pattern." })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ example: "alice" })
  @IsString()
  @IsNotEmpty()
  analyst!: string;
}

export class VerdictListQueryDto {
  @ApiPropertyOptional({ enum: ["allow", "quarantine", "block"] })
  @IsOptional()
  @IsIn(["allow", "quarantine", "block"])
  action?: string;

  @ApiPropertyOptional({ example: "acme/app" })
  @IsOptional()
  @IsString()
  repo?: string;

  @ApiPropertyOptional({ example: "shai-hulud" })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiPropertyOptional({ example: "2026-08-01T00:00:00Z" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-08-31T23:59:59Z" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: "Pagination cursor (reserved)." })
  @IsOptional()
  @IsString()
  cursor?: string;
}
