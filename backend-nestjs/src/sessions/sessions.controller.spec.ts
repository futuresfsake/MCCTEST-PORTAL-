import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { SessionsController } from './sessions.controller';

// The real JwtAuthGuard pulls in an ESM-only package Jest can't load (TECH-01).
jest.mock('../auth/guards/jwt-auth.guard', () => ({ JwtAuthGuard: class {} }));

describe('SessionsController access', () => {
  // The guard reads roles from the class; the handler only needs to exist.
  const handler = () => undefined;
  const guard = new RolesGuard();
  const contextFor = (role: Role) =>
    ({
      getClass: () => SessionsController,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;

  it('lets only an admin read session expirations', () => {
    expect(guard.canActivate(contextFor(Role.ADMIN))).toBe(true);
    for (const role of [
      Role.REGISTRAR,
      Role.TRAINER,
      Role.TRAINEE,
      Role.ENCODER,
    ]) {
      expect(() => guard.canActivate(contextFor(role))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('rejects a request with no user', () => {
    const noUser = {
      getClass: () => SessionsController,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(noUser)).toThrow(ForbiddenException);
  });
});
