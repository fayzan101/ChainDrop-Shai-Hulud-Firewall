import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { ScanEntity } from "./scan.entity";
import { FeedbackEntity } from "./feedback.entity";

export type VerdictAction = "allow" | "quarantine" | "block";
export type DatasetSplit = "train" | "val" | "heldout" | null;

@Entity("verdicts")
@Index(["action", "created_at"])
@Index(["repo", "created_at"])
export class VerdictEntity {
  @PrimaryColumn()
  verdict_id!: string;

  @Column()
  scan_id!: string;

  @ManyToOne(() => ScanEntity, (scan) => scan.verdicts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "scan_id" })
  scan!: ScanEntity;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;

  @Column()
  repo!: string;

  @Column()
  sha!: string;

  @Column()
  run_id!: string;

  @Column()
  package!: string;

  @Column()
  version!: string;

  @Column()
  hook!: string;

  @Column()
  script_sha256!: string;

  @Column({ type: "integer" })
  risk_score!: number;

  @Column()
  action!: VerdictAction;

  @Column({ type: "simple-json" })
  attack_techniques!: string[];

  @Column({ type: "simple-json" })
  matched_campaigns!: string[];

  @Column({ type: "text" })
  justification!: string;

  @Column({ type: "simple-json" })
  citations!: Array<{
    doc_id: string;
    title: string;
    url?: string | null;
    date?: string | null;
  }>;

  @Column()
  uncertainty!: string;

  @Column()
  reasoner_status!: string;

  @Column({ type: "text", nullable: true })
  model_version!: string | null;

  @Column({ type: "text", nullable: true })
  feature_schema_version!: string | null;

  @Column({ type: "text", nullable: true })
  corpus_version!: string | null;

  @Column({ type: "text", nullable: true })
  prompt_version!: string | null;

  @Column({ type: "text", nullable: true })
  classifier_label!: string | null;

  @Column({ type: "simple-json", nullable: true })
  sandbox!: Record<string, unknown> | null;

  @Column({ type: "boolean", default: false })
  degraded!: boolean;

  @Column({ type: "text", nullable: true })
  split!: DatasetSplit;

  @OneToOne(() => FeedbackEntity, (feedback) => feedback.verdict, {
    nullable: true,
  })
  feedback!: FeedbackEntity | null;
}
