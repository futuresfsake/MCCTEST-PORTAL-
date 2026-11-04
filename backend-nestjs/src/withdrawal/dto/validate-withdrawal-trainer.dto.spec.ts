import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateWithdrawalTrainerDto } from './validate-withdrawal-trainer.dto';

async function check(body: unknown) {
  const dto = plainToInstance(ValidateWithdrawalTrainerDto, body);
  const errors = await validate(dto, { whitelist: true });
  return { dto, errors };
}

describe('ValidateWithdrawalTrainerDto', () => {
  it('approve needs no remarks', async () => {
    const { errors } = await check({ action: 'APPROVE' });
    expect(errors).toHaveLength(0);
  });

  it('approve with remarks keeps them, trimmed', async () => {
    const { dto, errors } = await check({
      action: 'APPROVE',
      remarks: '  all good  ',
    });
    expect(errors).toHaveLength(0);
    expect(dto.remarks).toBe('all good');
  });

  it('approve with blank remarks is fine and counts as none', async () => {
    const { dto, errors } = await check({ action: 'APPROVE', remarks: '   ' });
    expect(errors).toHaveLength(0);
    expect(dto.remarks).toBeUndefined();
  });

  it('reject needs remarks', async () => {
    const { errors } = await check({ action: 'REJECT' });
    expect(errors.map((e) => e.property)).toContain('remarks');
  });

  it('reject with only blank remarks is refused', async () => {
    const { errors } = await check({ action: 'REJECT', remarks: '   ' });
    expect(errors.map((e) => e.property)).toContain('remarks');
  });

  it('reject with a reason is accepted', async () => {
    const { dto, errors } = await check({
      action: 'REJECT',
      remarks: 'Still owes attendance',
    });
    expect(errors).toHaveLength(0);
    expect(dto.remarks).toBe('Still owes attendance');
  });

  it.each([undefined, 'approve', 'DELETE', 'APPROVED', '', 7, null])(
    'rejects the action %p',
    async (action) => {
      const { errors } = await check({ action, remarks: 'x' });
      expect(errors.map((e) => e.property)).toContain('action');
    },
  );

  it('rejects remarks over 1000 characters', async () => {
    const { errors } = await check({
      action: 'REJECT',
      remarks: 'x'.repeat(1001),
    });
    expect(errors.map((e) => e.property)).toContain('remarks');
  });

  it('rejects remarks that are not text', async () => {
    const { errors } = await check({ action: 'APPROVE', remarks: { a: 1 } });
    expect(errors.map((e) => e.property)).toContain('remarks');
  });
});
