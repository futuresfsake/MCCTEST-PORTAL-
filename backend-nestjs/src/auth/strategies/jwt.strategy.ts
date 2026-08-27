import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Type declarations may be unavailable in environments where passport-jwt is
// installed without its optional DefinitelyTyped package.
// @ts-expect-error passport-jwt is provided at runtime by the authentication setup.
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;      // users.id (UUID)
  systemId: string; // users.system_id e.g. MCCTP-26-001
  role: string;     // user_role_enum
}

/**
 * Validates every incoming JWT:
 *  1. Signature check (via secret)
 *  2. Session still exists in DB and has not expired (stateful layer)
 *  3. User is still active
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      // Pass the raw request so we can read the session token header
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // The session token is sent as a custom header: X-Session-Token
    const sessionToken = (req.headers as any)['x-session-token'];

    if (!sessionToken) {
      throw new UnauthorizedException('Session token missing');
    }

    // Stateful check: session must exist and not be expired
    const session = await this.prisma.sessions.findUnique({
      where: { session_token: sessionToken },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or already logged out');
    }

    if (session.expires < new Date()) {
      // Clean up expired session
      await this.prisma.sessions.delete({ where: { session_token: sessionToken } });
      throw new UnauthorizedException('Session expired, please log in again');
    }

    if (session.user_id !== payload.sub) {
      throw new UnauthorizedException('Session / token mismatch');
    }

    // Verify user is still active in the source-of-truth table
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: { id: true, system_id: true, role: true, is_active: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account is inactive or not found');
    }

    // Returned object is attached to req.user on every protected route
    return {
      id: user.id,
      systemId: user.system_id,
      role: user.role,
    };
  }
}
