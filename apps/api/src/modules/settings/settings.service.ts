import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_FOOTER_CONFIG, FooterConfig, type UpdateFooterConfigDto } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export const FOOTER_KEY = 'footer';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async readRaw(key: string): Promise<unknown> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row?.valueJson ?? null;
  }

  private async write(key: string, value: Prisma.InputJsonValue) {
    return this.prisma.siteSetting.upsert({
      where: { key },
      update: { valueJson: value },
      create: { key, valueJson: value },
    });
  }

  /**
   * Returns the footer config, always fully-populated. Parsing through the Zod
   * schema fills any missing/renamed fields with defaults, so an older stored
   * document keeps rendering as the schema evolves. Falls back to the baseline
   * layout when nothing is stored or the stored blob is unparseable.
   */
  async getFooter(): Promise<FooterConfig> {
    const raw = await this.readRaw(FOOTER_KEY);
    if (raw == null) return DEFAULT_FOOTER_CONFIG;
    const parsed = FooterConfig.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_FOOTER_CONFIG;
  }

  async setFooter(config: UpdateFooterConfigDto): Promise<FooterConfig> {
    // Re-parse to normalize (apply defaults, strip unknown keys) before storing.
    const normalized = FooterConfig.parse(config);
    await this.write(FOOTER_KEY, normalized as unknown as Prisma.InputJsonValue);
    return normalized;
  }
}
