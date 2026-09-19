import { IsOptional, IsString, MaxLength } from 'class-validator';
console.log('UpdateStaffDto loaded');
/**
 * Only allows updating profile fields stored in our users table.
 * Auth fields (email, password) are managed via Supabase Auth directly.
 */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;
}
