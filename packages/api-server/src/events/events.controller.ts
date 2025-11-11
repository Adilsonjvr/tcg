import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ActiveUser } from '../auth/types/active-user.interface';
import { Public } from '../auth/public.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto, @Request() req: { user: ActiveUser }) {
    return this.eventsService.createEvent(req.user, dto);
  }

  @Public()
  @Get('validated')
  findValidated() {
    return this.eventsService.getValidatedEvents();
  }

  @Post(':id/confirm-presence')
  confirmPresence(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.eventsService.confirmPresence(id, req.user.id);
  }

  @Get(':id/aggregated-inventory')
  aggregatedInventory(@Param('id') id: string) {
    return this.eventsService.getAggregatedInventory(id);
  }

  @Get(':id/my-participation')
  getMyParticipation(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.eventsService.getMyParticipation(id, req.user.id);
  }

  @Get('me/participations')
  getMyParticipations(@Request() req: { user: ActiveUser }) {
    return this.eventsService.getMyParticipations(req.user.id);
  }
}
