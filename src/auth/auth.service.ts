import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { compare } from 'bcrypt';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { AuthDTO } from './auth.dto';
import {
  RefreshToken,
  refreshTokens,
  Role,
  type DrizzleDatabase,
  type User,
} from '@/db/schema';
import { InjectDrizzle } from '@nestjs/drizzle';
import ms, { StringValue } from 'ms';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';

export type JwtPayload = {
  sub: string;
  role: Role;
  exp?: number;
  iat?: number;
};

export type RequestAuthorized = Partial<Request> & { user: JwtPayload };

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    @InjectDrizzle() private readonly drizzle: DrizzleDatabase,
  ) {}

  private async generateRefreshToken({
    sub,
    role,
  }: {
    sub: string;
    role: Role | null;
  }) {
    const expires = ms(
      (process.env.REFRESH_TOKEN_EXPIRES as StringValue) ?? '7d',
    );
    const refreshToken = await this.jwt.signAsync(
      { sub, role },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: expires,
      },
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.drizzle.insert(refreshTokens).values({
      userId: sub,
      tokenHash,
      expiresAt: new Date(Date.now() + expires),
    });

    return refreshToken;
  }

  async authenticate({ identity, password }: AuthDTO) {
    const user = await this.userService.findOneByEmail(identity);

    if (user.length === 0) return null;
    if (!(await compare(password, user[0].password))) return null;
    return user;
  }

  async login(user: User | null) {
    if (!user) throw new BadRequestException('User is required');
    const { id, role } = user;

    const payload = { sub: id, role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken: await this.generateRefreshToken(payload),
    };
  }

  async regenerateToken(token: string) {
    try {
      const verifiedToken = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const incomingHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const savedToken: RefreshToken | undefined = (
        await this.drizzle
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.tokenHash, incomingHash),
              eq(refreshTokens.userId, verifiedToken.sub),
            ),
          )
      )[0];

      if (savedToken) {
        await this.drizzle
          .delete(refreshTokens)
          .where(and(eq(refreshTokens.id, savedToken.id)));
        const newRefreshToken = await this.generateRefreshToken({
          sub: verifiedToken.sub,
          role: verifiedToken.role,
        });
        const newToken = await this.jwt.signAsync(verifiedToken);
        return { refreshToken: newRefreshToken, accessToken: newToken };
      } else {
        throw new ForbiddenException();
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new BadRequestException('Refresh token expired');
      }

      if (e instanceof JsonWebTokenError) {
        throw new ForbiddenException('Invalid JSON Web Token');
      }

      throw new UnauthorizedException();
    }
  }
}
