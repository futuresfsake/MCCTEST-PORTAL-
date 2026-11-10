import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  @Matches(/^[0-9+()\- .]+$/, {
    message: 'contactNumber contains invalid characters',
  })
  contactNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  streetAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  barangay!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipality!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province!: string;
}
