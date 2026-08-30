import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { CorpusHealthResponseDto } from "../dto/response.dto";
import { CorpusService } from "./corpus.service";

@ApiTags("corpus")
@ApiBearerAuth("bearer")
@Controller("corpus")
@UseGuards(BearerAuthGuard)
export class CorpusController {
  constructor(private readonly corpusService: CorpusService) {}

  @Get("health")
  @ApiOperation({
    summary: "Report RAG corpus pin health",
    description: "Evaluation CI asserts `chaindrop_documents === 0` for no-chaindrop.",
  })
  @ApiOkResponse({ type: CorpusHealthResponseDto })
  health() {
    return this.corpusService.health();
  }
}
