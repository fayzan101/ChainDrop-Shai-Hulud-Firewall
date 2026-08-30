import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { BearerAuthGuard } from "../auth/bearer-auth.guard";
import { CreateScanDto } from "../dto/api.dto";
import { ScansService } from "./scans.service";

@Controller("scans")
@UseGuards(BearerAuthGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateScanDto) {
    return this.scansService.create(body);
  }

  @Get(":scan_id")
  findOne(@Param("scan_id") scanId: string) {
    return this.scansService.findOne(scanId);
  }
}
