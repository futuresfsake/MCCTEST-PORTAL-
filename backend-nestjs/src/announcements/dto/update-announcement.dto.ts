import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
