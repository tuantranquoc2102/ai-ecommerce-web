import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ENV_TOKEN, AppEnv } from '../../config/env';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  async beginSetup(userId: string, userEmail: string) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userEmail, this.env.TWOFA_ISSUER, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    // Stage the not-yet-confirmed secret; only persisted on enable().
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    return { otpauth, qrDataUrl };
  }

  async enable(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException({ code: '2FA_NOT_INITIALIZED', message: '2FA setup has not been started' });
    }
    if (!authenticator.check(code, user.twoFactorSecret)) {
      throw new BadRequestException({ code: '2FA_INVALID', message: 'Invalid 2FA code' });
    }
    const plainCodes = Array.from({ length: 10 }, () => this.genRecoveryCode());
    const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashed },
    });
    return { recoveryCodes: plainCodes };
  }

  async disable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException({ code: '2FA_NOT_ENABLED', message: '2FA is not enabled' });
    }
    if (!authenticator.check(code, user.twoFactorSecret)) {
      throw new BadRequestException({ code: '2FA_INVALID', message: 'Invalid 2FA code' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
    });
  }

  verifyCode(secret: string, code: string): boolean {
    return authenticator.check(code, secret);
  }

  async consumeRecoveryCode(userId: string, candidate: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    for (let i = 0; i < user.twoFactorRecoveryCodes.length; i++) {
      const hash = user.twoFactorRecoveryCodes[i]!;
      if (await bcrypt.compare(candidate, hash)) {
        const next = user.twoFactorRecoveryCodes.filter((_, idx) => idx !== i);
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorRecoveryCodes: next },
        });
        return true;
      }
    }
    return false;
  }

  private genRecoveryCode(): string {
    return crypto.randomBytes(5).toString('hex');
  }
}
