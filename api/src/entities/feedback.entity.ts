import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { VerdictEntity } from "./verdict.entity";

export type FeedbackLabel =
  | "confirm-malicious"
  | "false-positive"
  | "needs-more-data";

@Entity("feedback")
export class FeedbackEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  verdict_id!: string;

  @OneToOne(() => VerdictEntity, (verdict) => verdict.feedback, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "verdict_id" })
  verdict!: VerdictEntity;

  @Column()
  label!: FeedbackLabel;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @Column()
  analyst!: string;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;
}
