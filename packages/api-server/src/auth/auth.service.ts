import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

interface AuthenticatedUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  isKycVerified: boolean;
  responsavelId: string | null;
  parentLinkCode?: string | null;
  parentLinkCodeExpiresAt?: Date | null;
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly jwtExpiresIn = '1h';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    this.saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS ?? '12', 10);
  }

  async register(dto: RegisterDto) {
    const birthDate = new Date(dto.nascimento);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('nascimento must be a valid ISO date');
    }

    const normalisedEmail = dto.email.toLowerCase();
    const existing = await this.usersService.findByEmail(normalisedEmail);
    if (existing) {
      throw new ConflictException('email is already registered');
    }

    const age = this.calculateAge(birthDate);
    if (age < 0) {
      throw new BadRequestException('nascimento must be in the past');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const role = this.resolveRole(age, dto.role);

    const { parentLinkCode, parentLinkCodeExpiresAt } = this.prepareParentalLink(role);

    const user = await this.usersService.create({
      email: normalisedEmail,
      passwordHash,
      nome: dto.nome,
      nascimento: birthDate,
      role,
      parentLinkCode,
      parentLinkCodeExpiresAt,
    });

    return this.buildAuthResponse(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  async login(user: User) {
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.jwtExpiresIn });

    const response: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      isKycVerified: user.isKycVerified,
      responsavelId: user.responsavelId,
      parentLinkCode: user.parentLinkCode,
      parentLinkCodeExpiresAt: user.parentLinkCodeExpiresAt,
    };

    return {
      accessToken,
      user: {
        ...response,
        parentLinkCodeExpiresAt: response.parentLinkCodeExpiresAt?.toISOString() ?? null,
        requiresParentalLink: response.role === UserRole.MENOR && !response.responsavelId,
      },
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  private resolveRole(age: number, requestedRole?: UserRole): UserRole {
    if (age < 18) {
      return UserRole.MENOR;
    }

    if (!requestedRole) {
      return UserRole.ADULTO;
    }

    if (
      requestedRole === UserRole.ADULTO ||
      requestedRole === UserRole.RESPONSAVEL ||
      requestedRole === UserRole.VENDEDOR
    ) {
      return requestedRole;
    }

    throw new BadRequestException('requested role is not permitted');
  }

  private prepareParentalLink(role: UserRole) {
    if (role !== UserRole.MENOR) {
      return {
        parentLinkCode: null,
        parentLinkCodeExpiresAt: null,
      };
    }

    const parentLinkCode = this.generateParentLinkCode();
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);

    return {
      parentLinkCode,
      parentLinkCodeExpiresAt: expiresAt,
    };
  }

  private generateParentLinkCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
