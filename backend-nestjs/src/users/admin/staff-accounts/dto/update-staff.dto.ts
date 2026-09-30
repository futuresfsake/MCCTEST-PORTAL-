import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
console.log('UpdateStaffDto loaded');
/**
 * Only allows updating profile fields stored in our users table.
 * Auth fields (email, password) are managed via Supabase Auth directly.
 */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u, {
  message: 'First name can only contain letters, spaces, hyphens, and apostrophes',})  
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u, {
  message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',})  
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u, {
  message: 'Middle name can only contain letters, spaces, hyphens, and apostrophes',})  
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;
}
