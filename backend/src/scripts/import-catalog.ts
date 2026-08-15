/**
 * One-time BRISTI catalog import.
 *
 * Imports the 50 products from `catalog-data.ts` (extracted from
 * BRISTI_50_Product_Catalog(1).xlsx) into the Products system using the exact
 * same business logic the Admin "Add/Edit Product" flows use
 * (ProductService.createProduct / ProductService.updateProduct).
 *
 * Behaviour:
 *  - Resolves existing categories by name/slug; only creates a category when
 *    it does not already exist (never duplicates).
 *  - Parses the spreadsheet "Options" string ("Color: Black, White | Size: S,
 *    M, L, XL") into individual option values (no comma-separated single
 *    values).
 *  - Builds the full variant combination grid from the parsed options and
 *    stores one variant per combination (following the existing variant
 *    architecture, including the project's variant id/SKU conventions).
 *  - Sets stock to 10 on every variant and derives the product-level stock as
 *    the sum of variant stock (matching the existing model convention), so no
 *    created product/variant is left at 0.
 *  - Idempotent: if a product with the same SKU already exists it is updated,
 *    never duplicated.
 *
 * Usage: npm run db:import-catalog --workspace=backend
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { stopMemoryMongo } from '../config/database';
import { CategoryModel } from '../models/Category';
import { ProductModel } from '../models/Product';
import { InventoryItemModel } from '../models/InventoryItem';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { ProductService } from '../services/product.service';
import { CATALOG, CatalogProduct } from './catalog-data';

dotenv.config();

// Every catalog product ships with this stock on each variant.
const VARIANT_STOCK = 10;

// Parse "Color: Black, White | Size: S, M, L, XL" into
// [{ name: 'Color', values: ['Black', 'White'] }, { name: 'Size', values: ['S', 'M', 'L', 'XL'] }].
export function parseOptions(optionsText: string): Array<{ name: string; values: string[] }> {
  const options: Array<{ name: string; values: string[] }> = [];
  for (const group of optionsText.split('|')) {
    const trimmed = group.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const name = trimmed.slice(0, colon).trim();
    const values = trimmed
      .slice(colon + 1)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (name && values.length > 0) options.push({ name, values });
  }
  return options;
}

// Cartesian product over option values, in option order (Color slowest, Size
// fastest) — same algorithm the Admin edit form uses.
function buildCombinations(options: Array<{ name: string; values: string[] }>): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}];
  for (const option of options) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of option.values) {
        next.push({ ...combo, [option.name]: value });
      }
    }
    combos = next;
  }
  return combos;
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const comboLabel = (combo: Record<string, string>): string => Object.values(combo).join(' / ');

// Build the embedded variants array for a product. Variant id/SKU follow the
// conventions already used across the project (see seed.ts): id is a slug of
// the product slug + option values, SKU is `${baseSku}-${n}`.
function buildVariants(sku: string, productSlug: string, options: Array<{ name: string; values: string[] }>): any[] {
  const combos = buildCombinations(options);
  return combos.map((combo, index) => {
    const valueSlugs = Object.values(combo).map((v) => slugify(v));
    return {
      id: [productSlug, ...valueSlugs].join('-'),
      name: comboLabel(combo),
      options: { ...combo },
      priceAdjustment: 0,
      sku: `${sku}-${index + 1}`,
      stock: VARIANT_STOCK,
    };
  });
}

const RESOLVER_SETS: string[][] = [
  ['8.8.8.8', '1.1.1.1'],
  ['1.1.1.1', '8.8.8.8'],
  ['9.9.9.9', '149.112.112.112'],
  ['208.67.222.222', '208.67.220.220'],
];

export async function connect(): Promise<void> {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) {
    // Try multiple DNS resolvers before giving up. Atlas SRV lookups can fail
    // with querySrv ECONNREFUSED when the host's default resolver misbehaves
    // (e.g. corporate DNS), even though the cluster itself is reachable.
    const seen = new Set<string>();
    const sets = [...RESOLVER_SETS, dns.getServers()]
      .map((set) => set.filter(Boolean))
      .filter((set) => {
        const key = set.join(',');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    for (const set of sets) {
      dns.setServers(set);
      try {
        await mongoose.connect(configured, { serverSelectionTimeoutMS: 15000 } as any);
        console.log(`Connected to configured MongoDB: ${mongoose.connection.host} (dns: ${set.join(', ')})`);
        return;
      } catch (error: any) {
        console.warn(`MongoDB (dns: ${set.join(', ')}) connection failed: ${error?.message ?? error}`);
        await mongoose.disconnect().catch(() => undefined);
      }
    }
    // No in-memory fallback for a real import — fail loudly so data cannot be
    // silently written to (or lost from) an ephemeral database.
    throw new Error('Configured MONGODB_URI is unreachable from every DNS resolver set; aborting. Fix DNS/network access to MongoDB Atlas, then re-run.');
  }
  throw new Error('MONGODB_URI is not set; refusing to import into an in-memory database.');
}

// Resolve a category by exact name (case-insensitive) or slug; create it only
// when it does not exist so we never duplicate categories.
async function resolveCategory(name: string): Promise<any> {
  const slug = slugify(name);
  let category = await CategoryModel.findOne({
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (!category) category = await CategoryModel.findOne({ slug });
  if (category) return category;

  const count = await CategoryModel.countDocuments({});
  category = await CategoryModel.create({
    name,
    slug,
    level: 0,
    sortOrder: count,
    isActive: true,
  });
  console.log(`Category created: "${name}" (slug=${slug})`);
  return category;
}

function buildProductPayload(cat: CatalogProduct, categoryId: string): Record<string, any> {
  const options = parseOptions(cat.optionsText);
  const variants = buildVariants(cat.sku, slugify(cat.name), options);
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    name: cat.name,
    description: cat.description,
    shortDescription: cat.shortDescription,
    price: cat.price,
    compareAtPrice: cat.compareAtPrice,
    costPrice: cat.costPrice,
    category: categoryId,
    sku: cat.sku,
    stock: totalStock,
    trackQuantity: true,
    allowBackorder: false,
    lowStockThreshold: 5,
    status: 'active',
    options,
    variants,
    seoTitle: cat.seoTitle,
    seoDescription: cat.seoDescription,
    seoKeywords: cat.seoKeywords,
  };
}

// Instantiates the same service graph the product routes use.
export function buildServices(): { productService: ProductService; productRepo: ProductRepository } {
  const productRepo = new ProductRepository();
  const categoryRepo = new CategoryRepository();
  const collectionRepo = new CollectionRepository();
  const reviewRepo = new ReviewRepository();
  const inventoryRepo = new InventoryItemRepository();
  const wishlistRepo = new WishlistRepository();
  const cartRepo = new CartRepository();
  const couponRepo = new CouponRepository();
  const notificationService = new NotificationService(new NotificationRepository());
  const productService = new ProductService(
    productRepo,
    categoryRepo,
    collectionRepo,
    reviewRepo,
    inventoryRepo,
    wishlistRepo,
    cartRepo,
    couponRepo,
    notificationService
  );
  return { productService, productRepo };
}

export interface ImportReport {
  created: number;
  updated: number;
  failed: number;
  failures: Array<{ n: number; sku: string; error: string }>;
  duplicateSkus: string[];
  verified: number;
  categoryCounts: Map<string, number>;
  totalBt: number;
  invCount: number;
}

// Runs the import + verification against the connected database. Idempotent:
// existing SKUs are updated, never duplicated.
export async function importCatalog(productService: ProductService, productRepo: ProductRepository): Promise<ImportReport> {
  const results = { created: 0, updated: 0, failed: 0 };
  const failures: Array<{ n: number; sku: string; error: string }> = [];
  const duplicateSkus: string[] = [];

  // Detect duplicates within the source dataset up-front (should be none).
  const seen = new Set<string>();
  for (const cat of CATALOG) {
    if (seen.has(cat.sku)) duplicateSkus.push(cat.sku);
    seen.add(cat.sku);
  }

  for (const cat of CATALOG) {
    try {
      const category = await resolveCategory(cat.category);
      const payload = buildProductPayload(cat, String(category._id));

      const existing = await productRepo.findBySku(cat.sku);
      if (existing) {
        const updated = await productService.updateProduct(String(existing._id), payload);
        if (!updated) throw new Error('updateProduct returned no document');
        results.updated++;
        console.log(`[P${cat.n}] UPDATED ${cat.sku} "${cat.name}" (${payload.variants.length} variants, stock ${updated.stock})`);
      } else {
        const created = await productService.createProduct(payload);
        if (!created) throw new Error('createProduct returned no document');
        results.created++;
        console.log(`[P${cat.n}] CREATED ${cat.sku} "${cat.name}" (${payload.variants.length} variants, stock ${created.stock})`);
      }
    } catch (error: any) {
      results.failed++;
      failures.push({ n: cat.n, sku: cat.sku, error: error?.message || String(error) });
      console.error(`[P${cat.n}] FAILED ${cat.sku} "${cat.name}": ${error?.message || error}`);
    }
  }

  // ---------- Verification (persisted DB state) ----------
  console.log('\n================ VERIFICATION ================');
  let verified = 0;
  const categoryCounts = new Map<string, number>();

  for (const cat of CATALOG) {
    const product = await ProductModel.findOne({ sku: cat.sku });
    if (!product) {
      console.error(`VERIFY FAIL (missing product) P${cat.n} ${cat.sku}`);
      continue;
    }

    const checks: string[] = [];
    if (product.name !== cat.name) checks.push(`name="${product.name}"`);
    if (product.sku !== cat.sku) checks.push(`sku="${product.sku}"`);
    if (Number(product.price) !== cat.price) checks.push(`price=${product.price}`);
    if (Number(product.compareAtPrice) !== cat.compareAtPrice) checks.push(`compareAtPrice=${product.compareAtPrice}`);
    if (Number(product.costPrice) !== cat.costPrice) checks.push(`costPrice=${product.costPrice}`);
    if (product.shortDescription !== cat.shortDescription) checks.push('shortDescription mismatch');
    if (product.description !== cat.description) checks.push('description mismatch');
    if (product.seo?.title !== cat.seoTitle) checks.push('seo.title mismatch');
    if (product.seo?.description !== cat.seoDescription) checks.push('seo.description mismatch');
    if (product.seo?.keywords?.join(', ') !== cat.seoKeywords) checks.push(`seo.keywords=[${product.seo?.keywords?.join(', ')}]`);

    const category: any = await CategoryModel.findById(product.category);
    if (!category || category.name !== cat.category) {
      checks.push(`category="${category?.name ?? product.category}"`);
    } else {
      categoryCounts.set(cat.category, (categoryCounts.get(cat.category) ?? 0) + 1);
    }

    // Options: each option name must have exactly the expected values.
    const expectedOptions = parseOptions(cat.optionsText);
    const optionOk = expectedOptions.every((opt) => {
      const found = product.options?.find(
        (o: any) => o.name === opt.name && o.values?.length === opt.values.length && opt.values.every((v) => o.values.includes(v))
      );
      return Boolean(found);
    });
    if (!optionOk) checks.push(`options mismatch (expected ${JSON.stringify(expectedOptions)})`);

    // Variants: count must equal the cartesian product of option values, and
    // every variant must carry stock > 0 (10).
    const expectedCount = expectedOptions.reduce((acc, opt) => acc * opt.values.length, 1);
    const variantCount = product.variants?.length ?? 0;
    if (variantCount !== expectedCount) checks.push(`variant count=${variantCount} expected=${expectedCount}`);
    const zeroStock = product.variants?.some((v: any) => !(v.stock > 0));
    if (zeroStock) checks.push('variant stock <= 0 found');
    const anyVariantNotTen = product.variants?.some((v: any) => v.stock !== VARIANT_STOCK);
    if (anyVariantNotTen) checks.push('variant stock != 10 found');
    if (!(product.stock > 0)) checks.push(`product stock=${product.stock}`);

    // Inventory ledger entry must exist and have quantity > 0.
    const inv = await InventoryItemModel.findOne({ sku: product.sku });
    if (!inv) checks.push('inventory ledger missing');
    else if (!(inv.quantity > 0)) checks.push(`inventory quantity=${inv.quantity}`);

    if (checks.length > 0) {
      console.error(`VERIFY FAIL P${cat.n} ${cat.sku}: ${checks.join(' | ')}`);
    } else {
      verified++;
    }
  }

  const totalBt = await ProductModel.countDocuments({ sku: { $regex: /^BT-/ } });
  const invCount = await InventoryItemModel.countDocuments({ sku: { $regex: /^BT-/ } });

  return { ...results, failures, duplicateSkus, verified, categoryCounts, totalBt, invCount };
}

async function run(): Promise<void> {
  await connect();
  const { productService, productRepo } = buildServices();
  const report = await importCatalog(productService, productRepo);

  console.log('\n================ SUMMARY ================');
  console.log(`Source products          : ${CATALOG.length}`);
  console.log(`Created                  : ${report.created}`);
  console.log(`Updated                  : ${report.updated}`);
  console.log(`Failed                   : ${report.failed}`);
  console.log(`Duplicate SKUs in source : ${report.duplicateSkus.length > 0 ? report.duplicateSkus.join(', ') : 0}`);
  console.log(`BT-* products in DB      : ${report.totalBt}`);
  console.log(`BT-* inventory items     : ${report.invCount}`);
  console.log(`Categories used          : ${report.categoryCounts.size}`);
  for (const [name, count] of [...report.categoryCounts.entries()].sort()) {
    console.log(`   - ${name}: ${count}`);
  }
  console.log(`Products fully verified  : ${report.verified}/${CATALOG.length}`);
  if (report.failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of report.failures) console.log(`  - PRODUCT ${f.n} (${f.sku}): ${f.error}`);
  }

  if (report.failed > 0 || report.verified !== CATALOG.length) {
    throw new Error(`Import incomplete: ${report.failed} failed, ${report.verified}/${CATALOG.length} verified`);
  }

  await mongoose.disconnect();
  await stopMemoryMongo();
  console.log('\nImport complete — all 50 products verified.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('\nImport aborted:', err?.message || err);
    process.exit(1);
  });
}
