// backend-nestjs\src\users\admin\staff-accounts\staff-accounts.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { user_role_enum } from '../../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
console.log('StaffAccountsService loaded');
// Staff roles that can be managed from this endpoint
const STAFF_ROLES: user_role_enum[] = [
  user_role_enum.REGISTRAR,
  user_role_enum.TRAINER,
  user_role_enum.ENCODER,
];

@Injectable()
export class StaffAccountsService {
  private readonly logger = new Logger(StaffAccountsService.name);
  private readonly supabaseAdmin: SupabaseClient;
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Service-role key has admin privileges — never expose to frontend
    this.supabaseAdmin = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  // ── List staff ──────────────────────────────────────────────────────────────

  async findAll(filters: { role?: user_role_enum; isActive?: boolean }) {
    const { role, isActive } = filters;

    return this.prisma.users.findMany({
      where: {
        // Only return staff roles — never return ADMIN or TRAINEE from here
        role: role ? role : { in: STAFF_ROLES },
        ...(isActive !== undefined && { is_active: isActive }),
      },
      select: {
        id: true,
        email: true,
        system_id: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        created_at: true,
        avatar_url: true,
      },
      orderBy: [{ role: 'asc' }, { last_name: 'asc' }],
    });
  }

  // ── Get one staff member ────────────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.users.findFirst({
      where: { id, role: { in: STAFF_ROLES } },
      select: {
        id: true,
        system_id: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        avatar_url: true,
      },
    });

    if (!user) throw new NotFoundException(`Staff member not found`);
    return user;
  }

  // ── Create staff ────────────────────────────────────────────────────────────

  /**
   * Atomicity strategy:
   *  1. Create Supabase Auth user (email + password)
   *  2. Generate system_id
   *  3. Insert into our users table
   *
   * If step 3 fails, we delete the Supabase Auth user as compensation
   * so we don't end up with a ghost auth account with no DB row.
   */
  async create(dto: CreateStaffDto, createdByAdminId: string) {
    const { firstName, lastName, middleName, email, role, password } = dto;

    // ── Step 1: Create Supabase Auth user ───────────────────────────────────
    const { data: authData, error: authError } =
      await this.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip email verification — admin-created accounts are pre-confirmed
      });
    this.logger.log(
      `Supabase user created: ${authData.user?.id} / ${authData.user?.email}`,
    );

    if (authError || !authData.user) {
      this.logger.error(`Supabase Auth createUser failed: ${authError?.message}`);

      // Handle Supabase's duplicate email error as a clear conflict
      if (authError?.message?.toLowerCase().includes('already been registered')) {
        throw new ConflictException(
          `An account with the email "${email}" already exists`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to create auth account. Please try again.',
      );
    }

    const supabaseUserId = authData.user.id;

    // ── Step 3: Generate system_id ───────────────────────────────────────────
    const systemId = await this.generateSystemId();

    // ── Step 4: Hash password and insert into our users table ───────────────
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    try {
    const newUser = await this.prisma.users.create({
      data: {
        id: supabaseUserId,
        email,
        system_id: systemId,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        role: role as unknown as user_role_enum,
        password_hash: passwordHash,
        is_active: true,
      },
      select: {
        id: true,
        system_id: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    // Create trainer profile when the staff role is TRAINER
    if (role === user_role_enum.TRAINER) {
      await this.prisma.trainer.create({
        data: {
          user_id: newUser.id,
        },
      });
    }

      this.logger.log(
        `Admin ${createdByAdminId} created staff account ${newUser.system_id} (${role})`,
      );

      return {
        ...newUser,
        email, // returned so admin can note it down
      };
    } catch (dbError) {
      // ── Compensation: DB insert failed → clean up the Supabase Auth user ──
      this.logger.error(
        `DB insert failed for Supabase user ${supabaseUserId}. Rolling back auth user. Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
      );

      await this.supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch((e) => {
        this.logger.error(
          `CRITICAL: Failed to delete orphaned Supabase auth user ${supabaseUserId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      });

      throw new InternalServerErrorException(
        'Account creation failed. The operation has been rolled back.',
      );
    }
  }

// ── Update staff profile ────────────────────────────────────────────────────

async update(id: string, dto: UpdateStaffDto) {
  await this.findOne(id); // throws 404 if not found or not a staff role

  // ── Update Supabase Auth email first ─────────────────────────────────────
  if (dto.email) {
    const { error: authError } =
      await this.supabaseAdmin.auth.admin.updateUserById(id, {
        email: dto.email,
        email_confirm: true,
      });

    if (authError) {
      this.logger.error(
        `Supabase Auth email update failed for user ${id}: ${authError.message}`,
      );

      if (
        authError.message
          ?.toLowerCase()
          .includes('already registered')
      ) {
        throw new ConflictException(
          `An account with the email "${dto.email}" already exists`,
        );
      }

      throw new BadRequestException(
        'Failed to update email address. Please try again.',
      );
    }
  }

  // ── Update our users table ───────────────────────────────────────────────
  const updated = await this.prisma.users.update({
    where: { id },
    data: {
      ...(dto.firstName !== undefined && {
        first_name: dto.firstName,
      }),
      ...(dto.lastName !== undefined && {
        last_name: dto.lastName,
      }),
      ...(dto.middleName !== undefined && {
        middle_name: dto.middleName,
      }),
      ...(dto.email !== undefined && {
        email: dto.email,
      }),
      updated_at: new Date(),
    },
    select: {
      id: true,
      system_id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      email: true,
      role: true,
      is_active: true,
      updated_at: true,
    },
  });

  return updated;
}

  // ── Deactivate / Reactivate ─────────────────────────────────────────────────

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id); // throws 404 if not found

    const updated = await this.prisma.users.update({
      where: { id },
      data: {
        is_active: isActive,
        updated_at: new Date(),
      },
      select: {
        id: true,
        system_id: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
      },
    });

    // Also ban/unban the Supabase Auth user so they can't get new tokens
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: isActive ? 'none' : '876600h', // 'none' = unban; large value = effectively permanent ban
    });

    if (error) {
      // Non-fatal — our is_active check in the JWT strategy is the primary gate
      this.logger.warn(
        `Supabase ban/unban for user ${id} failed: ${error.message}. DB is_active updated regardless.`,
      );
    }

    this.logger.log(
      `Staff ${id} ${isActive ? 'reactivated' : 'deactivated'}`,
    );

    return {
      ...updated,
      message: isActive
        ? 'Account reactivated successfully'
        : 'Account deactivated successfully',
    };
  }

  // ── Password reset ──────────────────────────────────────────────────────────

  async triggerPasswordReset(id: string) {
    // Verify the staff member exists first
    await this.findOne(id);

    // Get the email from Supabase Auth (it's not stored in our users table)
    const { data: authUser, error: fetchError } =
      await this.supabaseAdmin.auth.admin.getUserById(id);

    if (fetchError || !authUser.user?.email) {
      throw new NotFoundException(
        'Could not find auth account for this staff member',
      );
    }

    const { error } = await this.supabaseAdmin.auth.resetPasswordForEmail(
      authUser.user.email,
      {
        redirectTo: `${this.config.get('FRONTEND_URL')}/reset-password`,
      },
    );

    if (error) {
      this.logger.error(`Password reset email failed for user ${id}: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to send password reset email. Please try again.',
      );
    }

    this.logger.log(`Password reset email sent for staff user ${id}`);

    return { message: 'Password reset email sent successfully' };
  }

  // ── system_id generator (same logic as auth.service.ts) ────────────────────

  private async generateSystemId(): Promise<string> {
    const yy = String(new Date().getFullYear()).slice(-2);
    const prefix = `MCCTP-${yy}-`;

    const last = await this.prisma.users.findFirst({
      where: { system_id: { startsWith: prefix } },
      orderBy: { system_id: 'desc' },
      select: { system_id: true },
    });

    let nextSeq = 1;
    if (last?.system_id) {
      const parts = last.system_id.split('-');
      nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    const systemId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // Guard against race condition
    const exists = await this.prisma.users.findUnique({ where: { system_id: systemId } });
    if (exists) return this.generateSystemId();

    return systemId;
  }
}
