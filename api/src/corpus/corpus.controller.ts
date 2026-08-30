import { Controller, Get, UseGuards } from "@nestjs/common";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { CorpusService } from "./corpus.service";

@Controller("corpus")
@UseGuards(BearerAuthGuard)
export class CorpusController {
  constructor(private readonly corpusService: CorpusService) {}

  @Get("health")
  health() {
    return this.corpusService.health();
  }
}
