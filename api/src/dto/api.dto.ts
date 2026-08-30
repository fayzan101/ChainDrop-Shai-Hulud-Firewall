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

class CitationDto {
  @IsString()
  doc_id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  url?: string | null;

  @IsOptional()
  @IsString()
  date?: string | null;
}

export class VerdictInputDto {
  @IsString()
  @IsNotEmpty()
  repo!: string;

  @IsString()
  @IsNotEmpty()
  sha!: string;

  @IsString()
  @IsNotEmpty()
  run_id!: string;

  @IsString()
  @IsNotEmpty()
  package!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsIn(["preinstall", "install", "postinstall"])
  hook!: "preinstall" | "install" | "postinstall";

  @IsString()
  script_sha256!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  risk_score!: number;

  @IsIn(["allow", "quarantine", "block"])
  action!: "allow" | "quarantine" | "block";

  @IsArray()
  @IsString({ each: true })
  attack_techniques!: string[];

  @IsArray()
  @IsString({ each: true })
  matched_campaigns!: string[];

  @IsString()
  justification!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationDto)
  citations!: CitationDto[];

  @IsIn(["low", "medium", "high"])
  uncertainty!: "low" | "medium" | "high";

  @IsIn(["ok", "degraded", "skipped"])
  reasoner_status!: "ok" | "degraded" | "skipped";

  @IsOptional()
  @IsString()
  model_version?: string | null;

  @IsOptional()
  @IsString()
  feature_schema_version?: string | null;

  @IsOptional()
  @IsString()
  corpus_version?: string | null;

  @IsOptional()
  @IsString()
  prompt_version?: string | null;

  @IsOptional()
  @IsString()
  classifier_label?: string | null;

  @IsOptional()
  @IsObject()
  sandbox?: Record<string, unknown> | null;

  @IsBoolean()
  degraded!: boolean;

  @IsOptional()
  @IsIn(["train", "val", "heldout"])
  split?: "train" | "val" | "heldout" | null;
}

export class CreateScanDto {
  @IsString()
  repo!: string;

  @IsString()
  sha!: string;

  @IsString()
  run_id!: string;

  @IsString()
  lockfile_digest!: string;

  @IsOptional()
  @IsIn(["train", "val", "heldout"])
  split?: "train" | "val" | "heldout" | null;

  @IsOptional()
  @IsObject()
  scan_payload?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerdictInputDto)
  verdicts!: VerdictInputDto[];
}

export class FeedbackDto {
  @IsIn(["confirm-malicious", "false-positive", "needs-more-data"])
  label!: "confirm-malicious" | "false-positive" | "needs-more-data";

  @IsOptional()
  @IsString()
  comment?: string;

  @IsString()
  @IsNotEmpty()
  analyst!: string;
}
