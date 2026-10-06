import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { announcement_scope_enum } from '../../generated/prisma/client';

export class CreateAnnouncementDto {
  @IsEnum(announcement_scope_enum)
  scope!: announcement_scope_enum;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ValidateIf(
    (dto: CreateAnnouncementDto) =>
      dto.scope === announcement_scope_enum.PROGRAM,
  )
  @IsUUID()
  @IsNotEmpty()
  program_id?: string;

  @ValidateIf(
    (dto: CreateAnnouncementDto) => dto.scope === announcement_scope_enum.BATCH,
  )
  @IsUUID()
  @IsNotEmpty()
  batch_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
