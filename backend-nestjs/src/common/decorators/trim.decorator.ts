import { Transform } from 'class-transformer';

/** Trims a string field, so a value of only spaces fails `@IsNotEmpty()`. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
