import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Trim } from '../../../../common/decorators/trim.decorator';
import {
  SCHEDULE_REASON_MAX,
  SCHEDULE_REASON_MIN,
} from '../../../../batch-schedule/batch-schedule.constants';
import { batch_status_enum } from '../../../../generated/prisma/enums';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'must be a date (YYYY-MM-DD)';

/** The statuses the list can be filtered by. Cancelled batches are not listed. */
export const CLASS_LIST_STATUSES = [
  batch_status_enum.OPEN,
  batch_status_enum.ONGOING,
  batch_status_enum.CLOSED,
] as const;

export class ClassListQueryDto {
  @IsOptional()
  @IsIn(CLASS_LIST_STATUSES)
  status?: (typeof CLASS_LIST_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class DateCheckQueryDto {
  @Matches(DATE_ONLY, { message: `startDate ${DATE_MESSAGE}` })
  startDate!: string;

  @Matches(DATE_ONLY, { message: `endDate ${DATE_MESSAGE}` })
  endDate!: string;
}

/**
 * Every change carries a reason and the dates and status the trainer saw, so a
 * batch that changed in the meantime is refused instead of overwritten.
 */
class ScheduleChangeDto {
  @Trim()
  @IsString()
  @MinLength(SCHEDULE_REASON_MIN, {
    message: `The reason must be at least ${SCHEDULE_REASON_MIN} characters.`,
  })
  @MaxLength(SCHEDULE_REASON_MAX, {
    message: `The reason must be at most ${SCHEDULE_REASON_MAX} characters.`,
  })
  reason!: string;

  @Matches(DATE_ONLY, { message: `expectedStartDate ${DATE_MESSAGE}` })
  expectedStartDate!: string;

  @Matches(DATE_ONLY, { message: `expectedEndDate ${DATE_MESSAGE}` })
  expectedEndDate!: string;

  @IsEnum(batch_status_enum)
  expectedStatus!: batch_status_enum;
}

/** Posts an announcement to the batch with the new dates. On unless sent false. */
class NotifyingChangeDto extends ScheduleChangeDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value ?? true)
  @IsBoolean()
  notifyTrainees = true;
}

export class SetStartDateDto extends NotifyingChangeDto {
  @Matches(DATE_ONLY, { message: `startDate ${DATE_MESSAGE}` })
  startDate!: string;

  /** Left out: the end date moves by the same number of days. */
  @IsOptional()
  @Matches(DATE_ONLY, { message: `endDate ${DATE_MESSAGE}` })
  endDate?: string;
}

export class SetEndDateDto extends NotifyingChangeDto {
  @Matches(DATE_ONLY, { message: `endDate ${DATE_MESSAGE}` })
  endDate!: string;
}

export class StartClassDto extends ScheduleChangeDto {}

export class CloseClassDto extends ScheduleChangeDto {}
