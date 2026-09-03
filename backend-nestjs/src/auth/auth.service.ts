import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { user_role_enum } from '../generated/prisma/client';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface LoginDto {
  systemId: string;   // e.g. MCCTP-26-001
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  sessionToken: string;
  user: {
    id: string;
    systemId: string;
    role: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface CreateAccountDto {
  firstName: string;
  lastName: string;
  middleName: string;
  role: Role;
  password: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  /** Sessions last 8 hours by default */
  private readonly SESSION_TTL_MS = 8 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponse> {
    const { systemId, password } = dto;

    // 1. Find user by system_id (the login field)
    const user = await this.prisma.users.findUnique({
      where: { system_id: systemId },
      select: {
        id: true,
        system_id: true,
        first_name: true,
        last_name: true,
        role: true,
        password_hash: true,
        is_active: true,
        avatar_url: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Sign JWT
    const payload = {
      sub: user.id,
      systemId: user.system_id,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload);

    // 4. Create a stateful session record
    const sessionToken = randomBytes(48).toString('hex');
    const expires = new Date(Date.now() + this.SESSION_TTL_MS);

    // Clean up any previous sessions for this user (single session policy)
    await this.prisma.sessions.deleteMany({ where: { user_id: user.id } });

    await this.prisma.sessions.create({
      data: {
        user_id: user.id,
        session_token: sessionToken,
        expires,
      },
    });

    this.logger.log(`User ${user.system_id} logged in — session created`);

    return {
      accessToken,
      sessionToken,
      user: {
        id: user.id,
        systemId: user.system_id ?? '',
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
      },
    };
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  async logout(sessionToken: string): Promise<{ message: string }> {
    const session = await this.prisma.sessions.findUnique({
      where: { session_token: sessionToken },
    });

    if (!session) {
      // Already logged out — treat as success
      return { message: 'Logged out successfully' };
    }

    await this.prisma.sessions.delete({ where: { session_token: sessionToken } });
    this.logger.log(`Session deleted for user ${session.user_id}`);

    return { message: 'Logged out successfully' };
  }

  // ── Create Account (Admin only) ─────────────────────────────────────────────

  async createAccount(
    dto: CreateAccountDto,
    createdByUserId: string,
  ): Promise<{ systemId: string; userId: string }> {
    const { firstName, lastName, middleName, role, password } = dto;

    // Validate that the creator is an admin (double-check at service level)
    const creator = await this.prisma.users.findUnique({
      where: { id: createdByUserId },
      select: { role: true },
    });

    if (!creator || creator.role !== user_role_enum.ADMIN) {
      throw new UnauthorizedException('Only admins can create accounts');
    }

    // Generate system_id: MCCTP-YY-SEQUENCE
    const systemId = await this.generateSystemId();

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const newUser = await this.prisma.users.create({
      data: {
        system_id: systemId,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        role: role as unknown as user_role_enum,
        password_hash: passwordHash,
        is_active: true,
      },
      select: { id: true, system_id: true },
    });

    this.logger.log(
      `Admin ${createdByUserId} created account ${newUser.system_id} with role ${role}`,
    );

    return { systemId: newUser.system_id ?? '', userId: newUser.id };
  }

  // ── system_id Generator ─────────────────────────────────────────────────────

  /**
   * Generates the next system_id in the format: MCCTP-YY-SEQUENCE
   *
   * Examples:
   *   2026 → MCCTP-26-001
   *   2026 → MCCTP-26-002
   *   2030 → MCCTP-30-001
   *
   * Uses a DB query to find the highest existing sequence for the current year
   * and increments it. This avoids a separate sequence table and stays simple.
   * NOTE: For high-concurrency, wrap in a transaction or use a DB sequence.
   */
  private async generateSystemId(): Promise<string> {
    const now = new Date();
    // Two-digit year: 2026 → '26'
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `MCCTP-${yy}-`;

    // Find the highest existing system_id for this year
    const last = await this.prisma.users.findFirst({
      where: { system_id: { startsWith: prefix } },
      orderBy: { system_id: 'desc' },
      select: { system_id: true },
    });

    let nextSeq = 1;
    if (last) {
      // system_id = MCCTP-26-042 → split on '-' → ['MCCTP','26','042'] → last part
      const parts = (last.system_id ?? '').split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      nextSeq = lastSeq + 1;
    }

    // Zero-pad to 3 digits: 1 → '001', 42 → '042'
    const seq = String(nextSeq).padStart(3, '0');

    const systemId = `${prefix}${seq}`;

    // Guard: ensure uniqueness (race condition safety)
    const exists = await this.prisma.users.findUnique({
      where: { system_id: systemId },
    });

    if (exists) {
      // Retry with next sequence (simple recursive retry)
      return this.generateSystemId();
    }

    return systemId;
  }

  // ── Get current user profile ────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        system_id: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        avatar_url: true,
        is_active: true,
        created_at: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
