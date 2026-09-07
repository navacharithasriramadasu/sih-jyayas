import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { FindMatchesDto } from './dto/find-matches.dto';

@Controller('api/matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('find')
  async findMatches(@Query(new ValidationPipe({ transform: true })) query: FindMatchesDto) {
    return this.matchingService.findMatches(query);
  }
}
