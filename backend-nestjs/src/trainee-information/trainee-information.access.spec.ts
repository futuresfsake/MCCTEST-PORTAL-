import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { AdminTraineesController } from '../users/admin/trainee-information/trainees.controller';
import { EncoderTraineesController } from '../users/encoder/trainee-information/trainees.controller';
import { RegistrarTraineesController } from '../users/registrar/trainees/trainees.controller';
import { TrainerTraineesController } from '../users/trainer/trainee-information/trainees.controller';

// The real JwtAuthGuard pulls in an ESM-only package Jest can't load (TECH-01).
// Authentication is not under test here; RolesGuard is.
jest.mock('../auth/guards/jwt-auth.guard', () => ({ JwtAuthGuard: class {} }));

type ControllerClass = { prototype: object };

/** Each trainee-information controller and the single role allowed to use it. */
const CONTROLLERS: [string, ControllerClass, Role][] = [
  ['admin', AdminTraineesController, Role.ADMIN],
  ['registrar', RegistrarTraineesController, Role.REGISTRAR],
  ['trainer', TrainerTraineesController, Role.TRAINER],
  ['encoder', EncoderTraineesController, Role.ENCODER],
];
const HANDLERS = ['findAll', 'getFilterOptions', 'findOne'] as const;

function contextFor(
  controller: ControllerClass,
  handler: (typeof HANDLERS)[number],
  role: Role,
): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () =>
      (controller.prototype as Record<string, unknown>)[handler],
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('Trainee Information role access', () => {
  const guard = new RolesGuard();

  describe.each(CONTROLLERS)('%s endpoints', (_name, controller, allowed) => {
    it.each(HANDLERS)('%s: only %s role is let in', (handler) => {
      for (const role of Object.values(Role)) {
        const check = () =>
          guard.canActivate(contextFor(controller, handler, role));
        if (role === allowed) {
          expect(check()).toBe(true);
        } else {
          expect(check).toThrow(ForbiddenException);
        }
      }
    });
  });
});
