/*
  Warnings:

  - Added the required column `url` to the `DigitalAsset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DigitalAsset" ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "storageKey" DROP NOT NULL,
ALTER COLUMN "fileSize" SET DEFAULT 0,
ALTER COLUMN "contentType" SET DEFAULT 'application/octet-stream';

-- CreateTable
CREATE TABLE "ProductRelation" (
    "productId" TEXT NOT NULL,
    "relatedProductId" TEXT NOT NULL,

    CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("productId","relatedProductId")
);

-- CreateTable
CREATE TABLE "ProductComboItem" (
    "productId" TEXT NOT NULL,
    "comboProductId" TEXT NOT NULL,

    CONSTRAINT "ProductComboItem_pkey" PRIMARY KEY ("productId","comboProductId")
);

-- CreateIndex
CREATE INDEX "ProductRelation_relatedProductId_idx" ON "ProductRelation"("relatedProductId");

-- CreateIndex
CREATE INDEX "ProductComboItem_comboProductId_idx" ON "ProductComboItem"("comboProductId");

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_relatedProductId_fkey" FOREIGN KEY ("relatedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_comboProductId_fkey" FOREIGN KEY ("comboProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
