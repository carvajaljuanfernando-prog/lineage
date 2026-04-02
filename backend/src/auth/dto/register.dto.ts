// ── DTOs ─────────────────────────────────────────────────────
// dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString() centerName: string;
  @IsString() tenantSlug: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() country?: string;
}
