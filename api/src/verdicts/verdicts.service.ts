import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FeedbackDto, VerdictListQueryDto } from "../dto/api.dto";
import { FeedbackEntity } from "../entities/feedback.entity";
import { VerdictEntity } from "../entities/verdict.entity";
import { serializeFeedback, serializeVerdict } from "../serialization";

const ACTION_ORDER = { block: 0, quarantine: 1, allow: 2 } as const;

@Injectable()
export class VerdictsService {
  constructor(
    @InjectRepository(VerdictEntity)
    private readonly verdicts: Repository<VerdictEntity>,
    @InjectRepository(FeedbackEntity)
    private readonly feedback: Repository<FeedbackEntity>,
  ) {}

  async list(query: VerdictListQueryDto) {
    const qb = this.verdicts
      .createQueryBuilder("verdict")
      .leftJoinAndSelect("verdict.feedback", "feedback")
      .orderBy("verdict.created_at", "DESC")
      .take(100);

    if (query.action) {
      qb.andWhere("verdict.action = :action", { action: query.action });
    }
    if (query.repo) {
      qb.andWhere("verdict.repo = :repo", { repo: query.repo });
    }
    if (query.campaign) {
      qb.andWhere("verdict.matched_campaigns LIKE :campaign", {
        campaign: `%${query.campaign}%`,
      });
    }
    if (query.from) {
      qb.andWhere("verdict.created_at >= :from", { from: query.from });
    }
    if (query.to) {
      qb.andWhere("verdict.created_at <= :to", { to: query.to });
    }

    const rows = await qb.getMany();
    rows.sort((a, b) => {
      const actionDelta =
        ACTION_ORDER[a.action as keyof typeof ACTION_ORDER] -
        ACTION_ORDER[b.action as keyof typeof ACTION_ORDER];
      if (actionDelta !== 0) {
        return actionDelta;
      }
      return b.created_at.getTime() - a.created_at.getTime();
    });

    return {
      items: rows.map(serializeVerdict),
      next_cursor: null,
    };
  }

  async findOne(verdictId: string) {
    const verdict = await this.verdicts.findOne({
      where: { verdict_id: verdictId },
      relations: { feedback: true },
    });
    if (!verdict) {
      throw new NotFoundException(`Verdict ${verdictId} not found`);
    }
    return serializeVerdict(verdict);
  }

  async addFeedback(verdictId: string, dto: FeedbackDto) {
    const verdict = await this.verdicts.findOne({
      where: { verdict_id: verdictId },
      relations: { feedback: true },
    });
    if (!verdict) {
      throw new NotFoundException(`Verdict ${verdictId} not found`);
    }

    if (verdict.split === "heldout" && dto.label === "false-positive") {
      throw new BadRequestException(
        "Held-out verdicts cannot be relabeled as false-positive via the dashboard",
      );
    }

    const originalSplit = verdict.split;
    let feedback = verdict.feedback;
    if (feedback) {
      feedback.label = dto.label;
      feedback.comment = dto.comment ?? null;
      feedback.analyst = dto.analyst;
    } else {
      feedback = this.feedback.create({
        verdict_id: verdict.verdict_id,
        label: dto.label,
        comment: dto.comment ?? null,
        analyst: dto.analyst,
      });
    }

    await this.feedback.save(feedback);
    verdict.feedback = feedback;
    verdict.split = originalSplit;
    await this.verdicts.save(verdict);

    return {
      verdict: serializeVerdict(verdict),
      feedback: serializeFeedback(feedback),
      heldout_split_preserved: originalSplit === "heldout",
    };
  }
}
