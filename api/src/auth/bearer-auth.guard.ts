import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class BearerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.SENTRYHULUD_API_TOKEN;
    if (!expected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    if (token !== expected) {
      throw new UnauthorizedException("Invalid bearer token");
    }
    return true;
  }
}
