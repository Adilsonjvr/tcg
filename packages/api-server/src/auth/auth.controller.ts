import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Body() _dto: LoginDto, @Request() req: { user: User }) {
    return this.authService.login(req.user);
  }
}
