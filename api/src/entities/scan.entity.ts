import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { VerdictEntity } from "./verdict.entity";

@Entity("scans")
@Index(["run_id", "lockfile_digest"], { unique: true })
export class ScanEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  repo!: string;

  @Column()
  sha!: string;

  @Column()
  run_id!: string;

  @Column()
  lockfile_digest!: string;

  @Column({ type: "simple-json", nullable: true })
  scan_payload!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;

  @OneToMany(() => VerdictEntity, (verdict) => verdict.scan)
  verdicts!: VerdictEntity[];
}
