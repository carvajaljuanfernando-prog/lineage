import { IsString, IsEmail, IsOptional, IsEnum, IsDateString } from 'class-validator';

enum Sex { MALE = 'MALE', FEMALE = 'FEMALE', OTHER = 'OTHER', UNKNOWN = 'UNKNOWN' }

export class CreatePatientDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEnum(Sex) sex: Sex;
  @IsOptional() @IsString() documentType?: string;
  @IsOptional() @IsString() documentNum?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() referralReason?: string;
  @IsOptional() @IsString() clinicalNotes?: string;
}

export class UpdatePatientDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() referralReason?: string;
  @IsOptional() @IsString() clinicalNotes?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
}
