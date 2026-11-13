import { IsEnum } from 'class-validator';
import { size_enum } from '../../../../generated/prisma/enums';

export class DistributeUniformDto {
  @IsEnum(size_enum)
  size!: size_enum;
}
