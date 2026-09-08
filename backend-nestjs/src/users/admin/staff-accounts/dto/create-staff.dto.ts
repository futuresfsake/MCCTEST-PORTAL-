import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
console.log('CreateStaffDto loaded');
// Staff roles only — ADMIN and TRAINEE cannot be created from this endpoint
export enum StaffRole {
  REGISTRAR = 'REGISTRAR',
  TRAINER = 'TRAINER',
  ENCODER = 'ENCODER',
}

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  middleName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsEnum(StaffRole, {
    message: 'role must be one of: REGISTRAR, TRAINER, ENCODER',
  })
  role!: StaffRole;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;
}
