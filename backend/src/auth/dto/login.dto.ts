import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
  // Solo necesario si el mismo correo pertenece a más de un centro clínico
  @IsOptional() @IsString() tenantSlug?: string;
}

export class RefreshTokenDto {
  @IsString() refreshToken: string;
}
