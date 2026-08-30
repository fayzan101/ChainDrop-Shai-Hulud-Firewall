import { Controller, Get, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { VerdictEntity } from "../entities/verdict.entity";

@Controller("metrics")
@UseGuards(BearerAuthGuard)
export class MetricsController {
  constructor(
    @InjectRepository(VerdictEntity)
    private readonly verdicts: Repository<VerdictEntity>,
  ) {}

  @Get()
  async summary() {
    const rows = await this.verdicts.find();
    const total = rows.length;
    const blocks = rows.filter((row) => row.action === "block").length;
    const quarantines = rows.filter((row) => row.action === "quarantine").length;
    const escalations = rows.filter(
      (row) => row.classifier_label === "escalate",
    ).length;

    return {
      scans_total: total,
      blocks_total: blocks,
      quarantines_total: quarantines,
      escalations_total: escalations,
      block_rate: total === 0 ? 0 : Number((blocks / total).toFixed(4)),
    };
  }
}
