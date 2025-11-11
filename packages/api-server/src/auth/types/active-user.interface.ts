import { UserRole } from '@prisma/client';

export interface ActiveUser {
  id: string;
  email: string;
  role: UserRole;
  isKycVerified: boolean;
  responsavelId: string | null;
}
