import { Body, Controller, ForbiddenException, Get, Param, Post, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ActiveUser } from '../auth/types/active-user.interface';
import { ParentalService } from './parental.service';
import { LinkParentDto } from './dto/link-parent.dto';
import { ParentalDecisionDto } from './dto/decision.dto';

@Controller('parental')
export class ParentalController {
  constructor(private readonly parentalService: ParentalService) {}

  @Post('link-account')
  linkAccount(@Body() dto: LinkParentDto, @Request() req: { user: ActiveUser }) {
    const requester = req.user;

    if (requester.role !== UserRole.RESPONSAVEL) {
      throw new ForbiddenException('only guardians can link child accounts');
    }

    if (!requester.isKycVerified) {
      throw new ForbiddenException('guardian must complete KYC before linking accounts');
    }

    return this.parentalService.linkAccount(requester.id, dto.parentLinkCode);
  }

  @Get('events/pending')
  listPendingEventApprovals(@Request() req: { user: ActiveUser }) {
    this.assertGuardian(req.user);
    return this.parentalService.listPendingEventApprovals(req.user.id);
  }

  @Post('events/:participationId/approve')
  approveEvent(
    @Param('participationId') participationId: string,
    @Body() dto: ParentalDecisionDto,
    @Request() req: { user: ActiveUser },
  ) {
    this.assertGuardian(req.user);
    return this.parentalService.approveEventParticipation(req.user.id, participationId, dto.note);
  }

  @Post('events/:participationId/reject')
  rejectEvent(
    @Param('participationId') participationId: string,
    @Body() dto: ParentalDecisionDto,
    @Request() req: { user: ActiveUser },
  ) {
    this.assertGuardian(req.user);
    return this.parentalService.rejectEventParticipation(req.user.id, participationId, dto.note);
  }

  @Get('trades/pending')
  listPendingTradeApprovals(@Request() req: { user: ActiveUser }) {
    this.assertGuardian(req.user);
    return this.parentalService.listPendingTradeApprovals(req.user.id);
  }

  @Get('dashboard')
  getDashboard(@Request() req: { user: ActiveUser }) {
    this.assertGuardian(req.user);
    return this.parentalService.getDashboard(req.user.id);
  }

  @Post('trades/:approvalId/approve')
  approveTrade(
    @Param('approvalId') approvalId: string,
    @Body() dto: ParentalDecisionDto,
    @Request() req: { user: ActiveUser },
  ) {
    this.assertGuardian(req.user);
    return this.parentalService.approveTrade(req.user.id, approvalId, dto.note);
  }

  @Post('trades/:approvalId/reject')
  rejectTrade(
    @Param('approvalId') approvalId: string,
    @Body() dto: ParentalDecisionDto,
    @Request() req: { user: ActiveUser },
  ) {
    this.assertGuardian(req.user);
    return this.parentalService.rejectTrade(req.user.id, approvalId, dto.note);
  }

  private assertGuardian(requester: ActiveUser) {
    if (requester.role !== UserRole.RESPONSAVEL) {
      throw new ForbiddenException('only guardians can perform this action');
    }

    if (!requester.isKycVerified) {
      throw new ForbiddenException('guardian must complete KYC before performing this action');
    }
  }
}
