import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SHIPPING_SETTINGS,
  FooterConfig,
  GeneralSettingsConfig,
  PaymentSettingsConfig,
  ShippingSettingsConfig,
  type UpdateFooterConfigDto,
  type UpdateGeneralSettingsDto,
  type UpdatePaymentSettingsDto,
  type UpdateShippingSettingsDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export const FOOTER_KEY = 'footer';
export const PAYMENTS_KEY = 'payments';
export const SHIPPING_KEY = 'shipping';
export const GENERAL_KEY = 'general';

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

  async getPayments(): Promise<PaymentSettingsConfig> {
    const raw = await this.readRaw(PAYMENTS_KEY);
    if (raw == null) return DEFAULT_PAYMENT_SETTINGS;
    const parsed = PaymentSettingsConfig.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_PAYMENT_SETTINGS;
  }

  async setPayments(config: UpdatePaymentSettingsDto): Promise<PaymentSettingsConfig> {
    const normalized = PaymentSettingsConfig.parse(config);
    await this.write(PAYMENTS_KEY, normalized as unknown as Prisma.InputJsonValue);
    return normalized;
  }

  async getShipping(): Promise<ShippingSettingsConfig> {
    const raw = await this.readRaw(SHIPPING_KEY);
    if (raw == null) return DEFAULT_SHIPPING_SETTINGS;
    const parsed = ShippingSettingsConfig.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_SHIPPING_SETTINGS;
  }

  async setShipping(config: UpdateShippingSettingsDto): Promise<ShippingSettingsConfig> {
    const normalized = ShippingSettingsConfig.parse(config);
    await this.write(SHIPPING_KEY, normalized as unknown as Prisma.InputJsonValue);
    return normalized;
  }

  async getGeneral(): Promise<GeneralSettingsConfig> {
    const raw = await this.readRaw(GENERAL_KEY);
    if (raw == null) return DEFAULT_GENERAL_SETTINGS;
    const parsed = GeneralSettingsConfig.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_GENERAL_SETTINGS;
  }

  async setGeneral(config: UpdateGeneralSettingsDto): Promise<GeneralSettingsConfig> {
    const normalized = GeneralSettingsConfig.parse(config);
    await this.write(GENERAL_KEY, normalized as unknown as Prisma.InputJsonValue);
    return normalized;
  }
}
