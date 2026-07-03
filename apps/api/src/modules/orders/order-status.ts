import { BadRequestException } from '@nestjs/common';
import type { OrderStatus } from '@ecom/shared';

/**
 * Allowed order status transitions.
 *
 *   PENDING → PAID | CANCELLED | EXPIRED
 *   PAID → PROCESSING | CANCELLED | REFUNDED
 *   PROCESSING → SHIPPING | CANCELLED | REFUNDED
 *   SHIPPING → COMPLETED | REFUNDED
 *   COMPLETED → REFUNDED
 *   CANCELLED / REFUNDED / EXPIRED are terminal.
 *
 * COD is a special case: admin marking a PENDING COD order as PROCESSING
 * auto-promotes through PAID first. The service handles that via a two-step
 * transition, so this table stays strict.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED', 'EXPIRED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPING', 'CANCELLED', 'REFUNDED'],
  SHIPPING: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  EXPIRED: [],
};

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  if (!ALLOWED[from].includes(to)) {
    throw new BadRequestException({
      code: 'INVALID_ORDER_TRANSITION',
      message: `Cannot transition order from ${from} to ${to}`,
    });
  }
}
