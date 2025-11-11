import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { TradingService } from './trading.service';
import { ProposeTradeDto } from './dto/propose-trade.dto';
import { ActiveUser } from '../auth/types/active-user.interface';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('propose')
  proposeTrade(@Body() dto: ProposeTradeDto, @Request() req: { user: ActiveUser }) {
    return this.tradingService.proposeTrade(req.user, dto);
  }

  @Get('me')
  getMyTrades(@Request() req: { user: ActiveUser }) {
    return this.tradingService.getTradesForUser(req.user);
  }

  @Get(':id')
  getTradeById(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.tradingService.getTradeById(req.user, id);
  }

  @Post(':id/accept')
  acceptTrade(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.tradingService.acceptTrade(req.user, id);
  }

  @Post(':id/confirm-handshake')
  confirmHandshake(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.tradingService.confirmHandshake(req.user, id);
  }

  @Post(':id/cancel')
  cancelTrade(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.tradingService.cancelTrade(req.user, id);
  }

  @Post(':id/reject')
  rejectTrade(@Param('id') id: string, @Request() req: { user: ActiveUser }) {
    return this.tradingService.rejectTrade(req.user, id);
  }
}
