-- Marketing promotions: campaign + flash sale engine
CREATE TYPE "PromotionKind" AS ENUM ('FLASH_SALE', 'CAMPAIGN');
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'SET_PRICE');

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "kind" "PromotionKind" NOT NULL,
  "discountType" "PromotionDiscountType" NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL,
  "maxDiscount" DECIMAL(12,2),
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "appliesToAllProducts" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionProduct" (
  "promotionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,

  CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("promotionId","productId")
);

CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");
CREATE INDEX "Promotion_kind_idx" ON "Promotion"("kind");
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");

ALTER TABLE "PromotionProduct"
  ADD CONSTRAINT "PromotionProduct_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromotionProduct"
  ADD CONSTRAINT "PromotionProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
