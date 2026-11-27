import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClearanceRequestDto } from './create-clearance-request.dto';

const valid = {
  enrollment_id: '44444444-4444-4444-8444-444444444444',
  certificates: ['COC'],
  purpose_of_request: 'Job application',
  certified: true,
};

async function failedFields(body: Record<string, unknown>) {
  const errors = await validate(
    plainToInstance(CreateClearanceRequestDto, body),
  );
  return errors.map((error) => error.property);
}

describe('CreateClearanceRequestDto', () => {
  it('accepts a complete form', async () => {
    await expect(failedFields(valid)).resolves.toEqual([]);
  });

  it.each([
    ['no enrollment', { enrollment_id: undefined }, 'enrollment_id'],
    ['a malformed id', { enrollment_id: 'abc' }, 'enrollment_id'],
    ['no certificate', { certificates: [] }, 'certificates'],
    ['certificates not a list', { certificates: 'COC' }, 'certificates'],
    ['an unknown certificate', { certificates: ['NC'] }, 'certificates'],
    ['the same one twice', { certificates: ['COC', 'COC'] }, 'certificates'],
    ['Other with no text', { certificates: ['OTHER'] }, 'other_specify'],
    [
      'Other with only spaces',
      { certificates: ['OTHER'], other_specify: '   ' },
      'other_specify',
    ],
    [
      'an oversized Other text',
      { certificates: ['OTHER'], other_specify: 'a'.repeat(101) },
      'other_specify',
    ],
    ['a blank purpose', { purpose_of_request: '  ' }, 'purpose_of_request'],
    [
      'an oversized purpose',
      { purpose_of_request: 'a'.repeat(501) },
      'purpose_of_request',
    ],
    ['an unticked box', { certified: false }, 'certified'],
    ['the box sent as text', { certified: 'true' }, 'certified'],
  ])('refuses %s', async (_label, change, field) => {
    await expect(failedFields({ ...valid, ...change })).resolves.toContain(
      field,
    );
  });
});
