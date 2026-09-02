import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a controller or route handler.
 * Usage: @Roles(Role.ADMIN, Role.REGISTRAR)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
