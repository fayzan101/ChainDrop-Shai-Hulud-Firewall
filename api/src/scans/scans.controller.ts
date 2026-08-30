import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { CreateScanDto } from "../dto/api.dto";
import {
  CreateScanResponseDto,
  ErrorResponseDto,
  ScanDetailResponseDto,
} from "../dto/response.dto";
import { ScansService } from "./scans.service";

@ApiTags("scans")
@ApiBearerAuth("bearer")
@Controller("scans")
@UseGuards(BearerAuthGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: "Record a scan from the Action",
    description:
      "Idempotent on `(run_id, lockfile_digest)`. Ingest per-script verdicts produced by config (a) or (c).",
  })
  @ApiCreatedResponse({ type: CreateScanResponseDto })
  create(@Body() body: CreateScanDto) {
    return this.scansService.create(body);
  }

  @Get(":scan_id")
  @ApiOperation({ summary: "Fetch a scan with all verdicts" })
  @ApiOkResponse({ type: ScanDetailResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param("scan_id") scanId: string) {
    return this.scansService.findOne(scanId);
  }
}
