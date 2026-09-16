import { announcement_scope_enum } from '../../generated/prisma/client';
import {
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsEnum(announcement_scope_enum)
  scope!: announcement_scope_enum;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @ValidateIf((dto) => dto.scope === announcement_scope_enum.PROGRAM)
  @IsUUID('4', { message: 'program_id is required for PROGRAM announcements' })
  @IsNotEmpty({ message: 'program_id is required for PROGRAM announcements' })
  @ValidateIf((dto) => dto.scope !== announcement_scope_enum.PROGRAM)
  @IsEmpty({ message: 'program_id must be absent unless scope is PROGRAM' })
  program_id?: string;

  @ValidateIf((dto) => dto.scope === announcement_scope_enum.BATCH)
  @IsUUID('4', { message: 'batch_id is required for BATCH announcements' })
  @IsNotEmpty({ message: 'batch_id is required for BATCH announcements' })
  @ValidateIf((dto) => dto.scope !== announcement_scope_enum.BATCH)
  @IsEmpty({ message: 'batch_id must be absent unless scope is BATCH' })
  batch_id?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
