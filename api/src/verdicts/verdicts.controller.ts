import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { FeedbackDto, VerdictListQueryDto } from "../dto/api.dto";
import {
  ErrorResponseDto,
  FeedbackResultDto,
  VerdictListResponseDto,
  VerdictResponseDto,
} from "../dto/response.dto";
import { VerdictsService } from "./verdicts.service";

@ApiTags("verdicts")
@ApiBearerAuth("bearer")
@Controller("verdicts")
@UseGuards(BearerAuthGuard)
export class VerdictsController {
  constructor(private readonly verdictsService: VerdictsService) {}

  @Get()
  @ApiOperation({
    summary: "List verdicts for the analyst queue",
    description: "Quarantine and block rows are sorted ahead of allow.",
  })
  @ApiOkResponse({ type: VerdictListResponseDto })
  list(@Query() query: VerdictListQueryDto) {
    return this.verdictsService.list(query);
  }

  @Get(":verdict_id")
  @ApiOperation({ summary: "Fetch a single verdict" })
  @ApiOkResponse({ type: VerdictResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param("verdict_id") verdictId: string) {
    return this.verdictsService.findOne(verdictId);
  }

  @Post(":verdict_id/feedback")
  @HttpCode(201)
  @ApiOperation({
    summary: "Record analyst feedback",
    description:
      "Feedback must not change `split=heldout`. False-positive labels are rejected for held-out rows.",
  })
  @ApiCreatedResponse({ type: FeedbackResultDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  addFeedback(
    @Param("verdict_id") verdictId: string,
    @Body() body: FeedbackDto,
  ) {
    return this.verdictsService.addFeedback(verdictId, body);
  }
}
