import { Role } from '../common/enums/role.enum';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService poster data', () => {
  const prisma = {
    announcements: { findMany: jest.fn().mockResolvedValue([]) },
    trainee: { findFirst: jest.fn().mockResolvedValue(null) },
    trainer: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const service = new AnnouncementsService(prisma as never);

  beforeEach(() => prisma.announcements.findMany.mockClear());

  it.each([Role.TRAINEE, Role.TRAINER, Role.ADMIN])(
    'never asks for the whole user row when %s reads active announcements',
    async (role) => {
      await service.findActive({ id: 'u1', role } as never);

      const args = prisma.announcements.findMany.mock.calls[0][0] as {
        include: { users: { select?: Record<string, boolean> } | boolean };
      };
      const users = args.include.users;
      expect(users).not.toBe(true);
      expect(typeof users).toBe('object');
      const fields = Object.keys((users as { select: object }).select);
      expect(fields).not.toContain('password_hash');
      expect(fields).not.toContain('email');
      expect(fields).toEqual(
        expect.arrayContaining(['first_name', 'last_name', 'role']),
      );
    },
  );
});
