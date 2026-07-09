import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

export const ReviewStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN']);
export type ReviewStatus = z.infer<typeof ReviewStatus>;

export const AdminListReviewsQuery = z.object({
  search: emptyToUndef(z.string().trim().max(200).optional()),
  status: ReviewStatus.optional(),
  productId: emptyToUndef(z.string().cuid().optional()),
  userId: emptyToUndef(z.string().cuid().optional()),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  sortBy: z.enum(['createdAt', 'rating']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type AdminListReviewsQuery = z.infer<typeof AdminListReviewsQuery>;

export const ModerateReviewDto = z.object({
  status: ReviewStatus,
});
export type ModerateReviewDto = z.infer<typeof ModerateReviewDto>;

export const ReplyReviewDto = z.object({
  reply: z.string().trim().min(1).max(2000),
});
export type ReplyReviewDto = z.infer<typeof ReplyReviewDto>;

export interface ReviewView {
  id: string;
  productId: string;
  product: { id: string; slug: string; title: string; mainImage: string | null } | null;
  userId: string | null;
  customerName: string | null;
  orderId: string | null;
  isVerifiedPurchase: boolean;
  rating: number;
  title: string | null;
  content: string;
  status: ReviewStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReviews {
  items: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
}
