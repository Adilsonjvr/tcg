import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { QuickSaleDto } from './dto/quick-sale.dto';
import { ActiveUser } from '../auth/types/active-user.interface';

@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('quick-sale')
  quickSale(@Body() dto: QuickSaleDto, @Request() req: { user: ActiveUser }) {
    return this.vendorService.createQuickSale(req.user, dto);
  }

  @Get('dashboard')
  dashboard(@Request() req: { user: ActiveUser }) {
    return this.vendorService.getDashboard(req.user);
  }
}
