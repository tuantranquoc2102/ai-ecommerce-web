import { Prisma, PrismaClient, ProductStatus, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds sample products across every leaf category in the DB. Runs
 * independently of the main seed (roles/permissions) so it's safe to invoke
 * repeatedly during POC iteration — every product upserts on slug, so re-runs
 * refresh prices/images/stock without duplicating rows.
 *
 * Images use `https://picsum.photos/seed/<slug>-<n>/800/800` — deterministic
 * placeholders, no upload required. Sample data is stored on the row (Prisma
 * `galleryImages` is a JSON field) exactly the way the storefront expects.
 */

interface ProductSeed {
  title: string;
  description: string;
  /** Base price in VND (integer). */
  basePrice: number;
  /** Optional sale price in VND; if omitted no sale badge shows. */
  salePrice?: number;
  stock?: number;
}

/**
 * Products are grouped by category slug. Every leaf category in the current
 * seed set gets 3 sample products, priced/named to reflect the category.
 */
const PRODUCTS_BY_CATEGORY_SLUG: Record<string, ProductSeed[]> = {
  cards: [
    { title: 'Handmade Birthday Card', description: 'Watercolour handmade birthday card on 300gsm cotton paper.', basePrice: 45_000, salePrice: 35_000, stock: 60 },
    { title: 'Watercolour Thank You Card', description: 'Set of 5 blank thank-you cards with kraft envelopes.', basePrice: 89_000, stock: 40 },
    { title: 'Rustic Wedding Invitation Card', description: 'Elegant kraft-paper wedding invite with vellum wrap.', basePrice: 65_000, stock: 120 },
  ],
  signs: [
    { title: 'Wooden Family Name Sign', description: 'Custom-engraved oak sign, 40×15cm. Perfect entryway welcome.', basePrice: 320_000, salePrice: 275_000, stock: 25 },
    { title: 'Vintage Coffee Shop Sign', description: 'Retro tin sign, 30×40cm. Screen-printed distressed finish.', basePrice: 150_000, stock: 60 },
    { title: 'Metal House Number Plate', description: 'Powder-coated steel house number, weatherproof.', basePrice: 220_000, stock: 40 },
  ],
  birthday: [
    { title: 'Rainbow Party Kit', description: 'Banner, balloons and confetti. Serves 12.', basePrice: 180_000, salePrice: 149_000, stock: 80 },
    { title: 'Number Candle Set (0-9)', description: 'Beeswax number candles, gold finish.', basePrice: 95_000, stock: 100 },
    { title: 'Foil Balloon Bouquet', description: 'Bouquet of 6 helium-ready foil balloons.', basePrice: 260_000, stock: 50 },
  ],
  "father-s-day": [
    { title: 'Personalized Whisky Glass', description: 'Etched crystal tumbler in wooden gift box.', basePrice: 450_000, salePrice: 385_000, stock: 30 },
    { title: 'Leather Bifold Wallet', description: 'Vegetable-tanned leather with monogram plate.', basePrice: 690_000, stock: 20 },
    { title: 'BBQ Tool Set (5-pc)', description: 'Stainless steel grill tools with cedar handles.', basePrice: 890_000, stock: 15 },
  ],
  "mother-s-day": [
    { title: 'Silk Scarf & Rose Bouquet', description: 'Hand-rolled silk scarf paired with fresh roses.', basePrice: 750_000, stock: 20 },
    { title: 'Ceramic Vase with Preserved Roses', description: 'Fluted ceramic vase, 24 preserved rose stems.', basePrice: 990_000, salePrice: 849_000, stock: 12 },
    { title: 'Jewellery Box with Gift Card', description: 'Velvet-lined wooden jewellery box.', basePrice: 320_000, stock: 40 },
  ],
  "valentine-s-day": [
    { title: 'Rose Preservation Dome', description: 'Real preserved rose under a glass dome, LED base.', basePrice: 620_000, salePrice: 549_000, stock: 25 },
    { title: 'Love Letter Chocolate Box', description: 'Belgian chocolates in a keepsake letterbox tin.', basePrice: 380_000, stock: 45 },
    { title: 'Heart-Cut Silver Necklace', description: '925 silver heart pendant with 18" chain.', basePrice: 890_000, stock: 20 },
  ],
  wedding: [
    { title: 'Bridal Bouquet — Preserved', description: 'Preserved wedding bouquet in glass display box.', basePrice: 1_450_000, stock: 8 },
    { title: 'Rustic Wedding Guest Book', description: 'Kraft cover, 200 acid-free pages, ribbon marker.', basePrice: 380_000, stock: 30 },
    { title: 'Champagne Flute Pair', description: 'Hand-cut crystal flutes engraved with initials.', basePrice: 750_000, salePrice: 649_000, stock: 25 },
  ],
  phones: [
    { title: 'iPhone Silicone Case', description: 'MagSafe-compatible silicone case with soft microfibre lining.', basePrice: 350_000, salePrice: 279_000, stock: 100 },
    { title: 'USB-C 65W Fast Charger', description: 'GaN charger with folding pins, single USB-C output.', basePrice: 490_000, stock: 60 },
    { title: 'Braided Lightning Cable 1.5m', description: 'MFi-certified braided cable, aluminium connectors.', basePrice: 180_000, stock: 150 },
  ],
  boxes: [
    { title: 'Rattan Storage Box (Medium)', description: 'Woven rattan basket with lid, 30×20×15cm.', basePrice: 280_000, stock: 40 },
    { title: 'Acacia Wood Keepsake Box', description: 'Hinged solid-acacia box with brass clasp.', basePrice: 420_000, salePrice: 349_000, stock: 25 },
    { title: 'Fabric Cube Storage Bin', description: 'Collapsible linen storage cube with rope handles.', basePrice: 145_000, stock: 90 },
  ],
  "cake-toppers": [
    { title: 'Happy Birthday Gold Topper', description: 'Glittered acrylic topper on wooden picks.', basePrice: 65_000, stock: 120 },
    { title: 'Bride & Groom Wedding Topper', description: 'Laser-cut acrylic bride & groom silhouettes.', basePrice: 220_000, stock: 40 },
    { title: 'Numeric Cake Topper Set', description: 'Numbers 0–9 in rose-gold acrylic. Reusable.', basePrice: 180_000, salePrice: 149_000, stock: 70 },
  ],
  organizers: [
    { title: 'Bamboo Drawer Organiser', description: 'Adjustable 5-compartment bamboo drawer tray.', basePrice: 320_000, stock: 45 },
    { title: 'Wall Key Hooks (5-pack)', description: 'Blackened brass key hooks on a walnut backing plate.', basePrice: 240_000, stock: 60 },
    { title: 'Desktop Pen Caddy', description: 'Turned-oak pen and stationery caddy.', basePrice: 180_000, salePrice: 149_000, stock: 80 },
  ],
  ornaments: [
    { title: 'Ceramic Bird Ornament', description: 'Hand-glazed stoneware sparrow, 12cm.', basePrice: 145_000, stock: 100 },
    { title: 'Glass Sphere Ornament', description: 'Mouth-blown clear-glass sphere with brass hanger.', basePrice: 95_000, stock: 150 },
    { title: 'Wooden Reindeer Ornament', description: 'Carved beech reindeer, natural finish.', basePrice: 120_000, stock: 90 },
  ],
  keychains: [
    { title: 'Leather Keychain (Tan)', description: 'Full-grain leather tag with brass swivel clip.', basePrice: 120_000, stock: 200 },
    { title: 'Alloy Compass Keychain', description: 'Working brass compass keyring in gift box.', basePrice: 180_000, salePrice: 149_000, stock: 90 },
    { title: 'Beaded Charm Keychain', description: 'Semi-precious stone beaded keyring, adjustable.', basePrice: 95_000, stock: 130 },
  ],
  "autumn-halloween": [
    { title: 'Pumpkin Door Wreath', description: 'Faux-pumpkin & maple-leaf wreath, 45cm.', basePrice: 380_000, salePrice: 329_000, stock: 30 },
    { title: 'Skull Candle Holder', description: 'Ceramic skull tealight holder, matte black.', basePrice: 150_000, stock: 60 },
    { title: 'Autumn Leaf Garland (2m)', description: 'Silk maple garland with acorn accents.', basePrice: 220_000, stock: 45 },
  ],
  "spring-easter": [
    { title: 'Pastel Egg Basket', description: 'Hand-painted wooden basket with 12 pastel eggs.', basePrice: 260_000, stock: 40 },
    { title: 'Bunny Plush Cushion', description: 'Chenille bunny throw pillow, 35×35cm.', basePrice: 180_000, salePrice: 149_000, stock: 65 },
    { title: 'Floral Easter Table Runner', description: 'Cotton table runner with embroidered blossoms.', basePrice: 210_000, stock: 50 },
  ],
  summer: [
    { title: 'Tropical Palm Cushion', description: 'Outdoor-safe printed canvas cushion.', basePrice: 195_000, stock: 80 },
    { title: 'Woven Beach Tote', description: 'Rope-handled straw tote with cotton liner.', basePrice: 320_000, salePrice: 269_000, stock: 60 },
    { title: 'Citrus Soy Candle Set', description: 'Set of 3 soy candles: bergamot, lime, grapefruit.', basePrice: 380_000, stock: 40 },
  ],
  "winter-christmas": [
    { title: 'Fir Wreath (60cm)', description: 'Preserved noble fir wreath with pinecones.', basePrice: 690_000, salePrice: 599_000, stock: 25 },
    { title: 'Snowflake Ornament Set (12)', description: 'Laser-cut wooden snowflakes with jute ties.', basePrice: 210_000, stock: 70 },
    { title: 'Wooden Advent Calendar', description: 'Reusable 24-door birch advent calendar.', basePrice: 890_000, stock: 20 },
  ],
  "board-games": [
    { title: 'Family Board Game Bundle', description: 'Three classic family board games in one box.', basePrice: 780_000, salePrice: 649_000, stock: 30 },
    { title: 'Strategy Card Deck', description: 'Compact strategy card game for 2–4 players.', basePrice: 220_000, stock: 100 },
    { title: 'Party Trivia Box', description: '1500-card trivia set for parties of 4–12.', basePrice: 490_000, stock: 45 },
  ],
  dollhouse: [
    { title: 'Miniature Kitchen Set', description: 'Wooden dollhouse kitchen with 24 accessories.', basePrice: 480_000, stock: 25 },
    { title: 'Two-Storey Wooden Dollhouse', description: 'Painted MDF dollhouse, self-assembly.', basePrice: 1_990_000, salePrice: 1_690_000, stock: 8 },
    { title: 'Dollhouse Accessories Pack', description: '36-piece furniture and figurines pack.', basePrice: 320_000, stock: 60 },
  ],
  transportation: [
    { title: 'Wooden Train Puzzle', description: '18-piece chunky wooden train puzzle for ages 3+.', basePrice: 240_000, stock: 70 },
    { title: 'Airplane 3D Puzzle', description: '58-piece balsawood aeroplane model.', basePrice: 340_000, salePrice: 279_000, stock: 40 },
    { title: 'Race Car Track Puzzle', description: 'Magnetic race track puzzle with 2 cars.', basePrice: 420_000, stock: 30 },
  ],
};

function pickImages(slug: string): { mainImage: string; galleryImages: string[] } {
  const url = (n: number) => `https://picsum.photos/seed/${slug}-${n}/800/800`;
  return { mainImage: url(1), galleryImages: [url(1), url(2), url(3), url(4)] };
}

async function main() {
  console.log('Seeding sample products…');

  const categories = await prisma.category.findMany({
    where: { slug: { in: Object.keys(PRODUCTS_BY_CATEGORY_SLUG) } },
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const missing = Object.keys(PRODUCTS_BY_CATEGORY_SLUG).filter((s) => !categoryIdBySlug.has(s));
  if (missing.length > 0) {
    console.warn(`Skipping — no category found for slugs: ${missing.join(', ')}`);
  }

  let created = 0;
  let updated = 0;

  for (const [catSlug, seeds] of Object.entries(PRODUCTS_BY_CATEGORY_SLUG)) {
    const categoryId = categoryIdBySlug.get(catSlug);
    if (!categoryId) continue;

    for (const seed of seeds) {
      const slug = toSlug(seed.title);
      const images = pickImages(slug);
      const basePrice = new Prisma.Decimal(seed.basePrice);
      const salePrice = seed.salePrice ? new Prisma.Decimal(seed.salePrice) : null;
      const stock = seed.stock ?? 25;

      const existing = await prisma.product.findUnique({ where: { slug } });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            title: seed.title,
            description: seed.description,
            mainImage: images.mainImage,
            galleryImages: images.galleryImages as unknown as Prisma.InputJsonValue,
            type: ProductType.PHYSICAL,
            basePrice,
            salePrice,
            stockQuantity: stock,
            status: ProductStatus.ACTIVE,
          },
        });
        // Reset category link so the product only ties to the seeded category.
        await prisma.productCategory.deleteMany({ where: { productId: existing.id } });
        await prisma.productCategory.create({
          data: { productId: existing.id, categoryId },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            slug,
            title: seed.title,
            description: seed.description,
            mainImage: images.mainImage,
            galleryImages: images.galleryImages as unknown as Prisma.InputJsonValue,
            type: ProductType.PHYSICAL,
            basePrice,
            salePrice,
            stockQuantity: stock,
            status: ProductStatus.ACTIVE,
            productCategories: { create: [{ categoryId }] },
          },
        });
        created++;
      }
    }
  }

  console.log(`Done. Created ${created}, updated ${updated}.`);
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
