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
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { FeedbackDto } from "../dto/api.dto";
import { VerdictsService } from "./verdicts.service";

@Controller("verdicts")
@UseGuards(BearerAuthGuard)
export class VerdictsController {
  constructor(private readonly verdictsService: VerdictsService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.verdictsService.list(query);
  }

  @Get(":verdict_id")
  findOne(@Param("verdict_id") verdictId: string) {
    return this.verdictsService.findOne(verdictId);
  }

  @Post(":verdict_id/feedback")
  @HttpCode(201)
  addFeedback(
    @Param("verdict_id") verdictId: string,
    @Body() body: FeedbackDto,
  ) {
    return this.verdictsService.addFeedback(verdictId, body);
  }
}
