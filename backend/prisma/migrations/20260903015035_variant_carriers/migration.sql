-- CreateEnum
CREATE TYPE "CarrierStatus" AS ENUM ('CARRIER', 'NON_CARRIER', 'PENDING', 'NOT_STUDIED');

-- CreateTable
CREATE TABLE "variant_carriers" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "status" "CarrierStatus" NOT NULL DEFAULT 'NOT_STUDIED',
    "testedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_carriers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "variant_carriers_variantId_familyMemberId_key" ON "variant_carriers"("variantId", "familyMemberId");

-- AddForeignKey
ALTER TABLE "variant_carriers" ADD CONSTRAINT "variant_carriers_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "genetic_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_carriers" ADD CONSTRAINT "variant_carriers_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
