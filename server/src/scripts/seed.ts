import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CategoryModel } from '../models/Category';
import { CollectionModel } from '../models/Collection';
import { ProductModel } from '../models/Product';
import { ReviewModel } from '../models/Review';
import { UserModel } from '../models/User';
import { SettingsModel } from '../models/Settings';
import { getMongoUri, stopMemoryMongo } from '../config/database';

dotenv.config();

const IMG = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const CATEGORIES = [
  { name: 'Oversized T-Shirts', slug: 'oversized-t-shirts', description: 'Relaxed, heavyweight tees cut with a contemporary silhouette.', image: IMG('photo-1620799140408-edc6dcb6d633', 900) },
  { name: 'Japanese Trouser', slug: 'japanese-trouser', description: 'Tailored trousers with a precise, architectural drape.', image: IMG('photo-1594633312681-425c7b97ccd1', 900) },
  { name: 'Gurkha Pant', slug: 'gurkha-pant', description: 'The heritage Gurkha waist — reimagined in luxurious fabrics.', image: IMG('photo-1594938298603-c8148c4dae35', 900) },
  { name: 'Shackets', slug: 'shackets', description: 'Overshirts that balance the weight of a jacket with the ease of a shirt.', image: IMG('photo-1552611052-33e04de081de', 900) },
  { name: 'Premium Shirts', slug: 'premium-shirts', description: 'Crisp poplins, airy linens and considered collars.', image: IMG('photo-1603252109303-2751441dd157', 900) },
  { name: 'Luxury Hoodies', slug: 'luxury-hoodies', description: 'Heavyweight fleece hoodies with an elevated hand-feel.', image: IMG('photo-1512374382149-233c42b6a83b', 900) },
  { name: 'Cargo Pants', slug: 'cargo-pants', description: 'Utility detailing on refined, modern cargos.', image: IMG('photo-1624378439575-d8705ad7ae80', 900) },
  { name: 'Sneakers', slug: 'sneakers', description: 'Minimal leather sneakers built for the everyday.', image: IMG('photo-1549298916-b41d501d3772', 900) },
  { name: 'Accessories', slug: 'accessories', description: 'The final details — caps, belts and scarves.', image: IMG('photo-1521369909029-2afed882baee', 900) },
];

const PRODUCTS: Array<Record<string, any>> = [
  // ——— Oversized T-Shirts ———
  {
    name: 'Aurelia Oversized Tee', category: 'oversized-t-shirts', price: 89, compareAtPrice: 119, rating: { average: 4.8, count: 214 },
    description: 'A heavyweight 320gsm cotton tee with a dropped shoulder and extended hem. Garment-dyed for depth of colour and finished with a ribbed crew neck.',
    shortDescription: 'Heavyweight garment-dyed cotton, dropped shoulder.', image: IMG('photo-1576566588028-4147f3842f27'), featured: true, tags: ['trending'],
  },
  {
    name: 'Meridian Vintage Tee', category: 'oversized-t-shirts', price: 79, rating: { average: 4.6, count: 148 },
    description: 'A pre-washed, relaxed tee in soft peached cotton with a slightly boxy silhouette and tonal stitching.',
    shortDescription: 'Pre-washed boxy tee, peached cotton.', image: IMG('photo-1521572163474-6864f9cf17ab'), featured: true,
  },
  {
    name: 'Atelier Box Tee', category: 'oversized-t-shirts', price: 95, compareAtPrice: 120, rating: { average: 4.7, count: 96 },
    description: 'A structured box cut in dense combed cotton with a clean, minimal front — the atelier staple.',
    shortDescription: 'Structured box cut in dense combed cotton.', image: IMG('photo-1618354691373-d851c5c3a990'), tags: ['trending'],
  },

  // ——— Japanese Trouser ———
  {
    name: 'Kyoto Wide-Leg Trouser', category: 'japanese-trouser', price: 189, compareAtPrice: 240, rating: { average: 4.9, count: 187 },
    description: 'An elevated wide-leg in brushed Japanese twill. High-rise with a concealed hook bar, extended waistband and a long, unbroken line.',
    shortDescription: 'Brushed Japanese twill, high-rise wide-leg.', image: IMG('photo-1584865288642-42078afe6942'), featured: true, tags: ['trending'],
  },
  {
    name: 'Nagoya Pleated Trouser', category: 'japanese-trouser', price: 175, rating: { average: 4.5, count: 121 },
    description: 'Single reverse pleats and a tapered leg in a fluid stretch-blend. Cut from a cloth with a subtle chalky surface.',
    shortDescription: 'Single reverse pleat, tapered leg.', image: IMG('photo-1560243563-062bfc001d68'), featured: true,
  },
  {
    name: 'Shibuya Draped Trouser', category: 'japanese-trouser', price: 165, rating: { average: 4.4, count: 74 },
    description: 'A softly draped trouser with a relaxed waist and gentle taper, cut in a whisper-light Japanese cotton.',
    shortDescription: 'Softly draped, whisper-light cotton.', image: IMG('photo-1594938298603-c8148c4dae35'),
  },

  // ——— Gurkha Pant ———
  {
    name: 'Kathmandu Gurkha Pant', category: 'gurkha-pant', price: 198, compareAtPrice: 250, rating: { average: 4.8, count: 132 },
    description: 'The classic Gurkha silhouette — side-tab waist, knife pleats and a double forward slant pocket — in crisp cotton-twill.',
    shortDescription: 'Classic side-tab Gurkha waist, cotton-twill.', image: IMG('photo-1594633312681-425c7b97ccd1'), featured: true, tags: ['trending'],
  },
  {
    name: 'Himal Gurkha Linen Pant', category: 'gurkha-pant', price: 185, rating: { average: 4.6, count: 88 },
    description: 'A breathable linen-blend Gurkha pant with a natural slub texture and an easy, tailored drape.',
    shortDescription: 'Linen-blend with natural slub texture.', image: IMG('photo-1541099649105-f69ad21f3246'),
  },

  // ——— Shackets ———
  {
    name: 'Alpine Overshirt Shacket', category: 'shackets', price: 210, compareAtPrice: 260, rating: { average: 4.7, count: 165 },
    description: 'A brushed wool-cotton overshirt with corozo buttons, double chest pockets and a boxy drape.',
    shortDescription: 'Wool-cotton brushed overshirt.', image: IMG('photo-1552611052-33e04de081de'), featured: true, tags: ['trending'],
  },
  {
    name: 'Summit Flannel Shacket', category: 'shackets', price: 195, rating: { average: 4.5, count: 102 },
    description: 'A heavyweight flannel shacket with a garment-washed hand, spread collar and camp placket.',
    shortDescription: 'Heavyweight garment-washed flannel.', image: IMG('photo-1591047139829-d91aecb6caea'),
  },
  {
    name: 'Ridge Wool Shacket', category: 'shackets', price: 230, rating: { average: 4.6, count: 77 },
    description: 'A tailored wool shacket with horn buttons and a clean, collarless line — a study in quiet utility.',
    shortDescription: 'Tailored collarless wool shacket.', image: IMG('photo-1539533018447-63fcce2678e3'),
  },

  // ——— Premium Shirts ———
  {
    name: 'Sartorial Oxford Shirt', category: 'premium-shirts', price: 125, compareAtPrice: 150, rating: { average: 4.8, count: 231 },
    description: 'A dense, softly-brushed oxford with a semi-spread collar and mother-of-pearl buttons.',
    shortDescription: 'Dense brushed oxford, mother-of-pearl buttons.', image: IMG('photo-1598032895397-b9472444bf93'), featured: true,
  },
  {
    name: 'Milan Poplin Shirt', category: 'premium-shirts', price: 135, rating: { average: 4.6, count: 119 },
    description: 'A crisp two-ply poplin with a spread collar and a precise, tailored fit.',
    shortDescription: 'Two-ply poplin, tailored fit.', image: IMG('photo-1603252109303-2751441dd157'), tags: ['trending'],
  },
  {
    name: 'Verona Linen Shirt', category: 'premium-shirts', price: 145, compareAtPrice: 175, rating: { average: 4.5, count: 93 },
    description: 'An airy European linen shirt with a camp collar and relaxed Italian drape.',
    shortDescription: 'European linen, relaxed camp collar.', image: IMG('photo-1520975916090-3105956dac38'),
  },

  // ——— Luxury Hoodies ———
  {
    name: 'Monarch Heavyweight Hoodie', category: 'luxury-hoodies', price: 175, compareAtPrice: 215, rating: { average: 4.9, count: 342 },
    description: 'A 480gsm loopback fleece hoodie with a boxy fit, dropped shoulder and double-tipped drawcords.',
    shortDescription: '480gsm loopback fleece, boxy fit.', image: IMG('photo-1512374382149-233c42b6a83b'), featured: true, tags: ['trending'],
  },
  {
    name: 'Serene French Terry Hoodie', category: 'luxury-hoodies', price: 155, rating: { average: 4.7, count: 205 },
    description: 'An unbrushed French terry hoodie in a soft heather with a clean kangaroo pocket.',
    shortDescription: 'Unbrushed French terry, heather.', image: IMG('photo-1556821840-3a63f95609a7'), featured: true,
  },
  {
    name: 'Eclipse Zip Hoodie', category: 'luxury-hoodies', price: 185, rating: { average: 4.6, count: 156 },
    description: 'A full-zip heavyweight hoodie with YKK hardware and a stand collar in dense cotton fleece.',
    shortDescription: 'Full-zip, stand collar, YKK hardware.', image: IMG('photo-1627225924765-552d49cf47ad'),
  },

  // ——— Cargo Pants ———
  {
    name: 'Terra Utility Cargo', category: 'cargo-pants', price: 165, compareAtPrice: 200, rating: { average: 4.7, count: 178 },
    description: 'A tapered cargo with hidden utility pockets and a drawcord waist, cut in a dry-hand ripstop.',
    shortDescription: 'Tapered ripstop cargo, hidden pockets.', image: IMG('photo-1624378439575-d8705ad7ae80'), featured: true, tags: ['trending'],
  },
  {
    name: 'Apex Tactical Cargo', category: 'cargo-pants', price: 175, rating: { average: 4.6, count: 94 },
    description: 'A structured cargo with articulated knees, adjustable cuff and a matte cotton shell.',
    shortDescription: 'Structured cargo, articulated knees.', image: IMG('photo-1584865288642-42078afe6942'),
  },

  // ——— Sneakers ———
  {
    name: 'Sovereign Court Sneaker', category: 'sneakers', price: 240, compareAtPrice: 280, rating: { average: 4.8, count: 267 },
    description: 'A full-grain leather court sneaker on a cushioned cupsole, with tonal stitching and a waxed flat lace.',
    shortDescription: 'Full-grain leather court sneaker.', image: IMG('photo-1549298916-b41d501d3772'), featured: true,
  },
  {
    name: 'Noir Minimal Runner', category: 'sneakers', price: 215, rating: { average: 4.5, count: 141 },
    description: 'A streamlined black runner in supple nappa with a low-profile sole and no visible branding.',
    shortDescription: 'Streamlined black nappa runner.', image: IMG('photo-1491553895911-0055eca6402d'), featured: true, tags: ['trending'],
  },
  {
    name: 'Ivory Court Low', category: 'sneakers', price: 225, rating: { average: 4.6, count: 118 },
    description: 'A clean ivory low-top in pebbled leather with a gum sole and perforated toe cap.',
    shortDescription: 'Pebbled leather, gum sole.', image: IMG('photo-1525966222134-fcfa99b8ae77'),
  },

  // ——— Accessories ———
  {
    name: 'Atelier Wool Cap', category: 'accessories', price: 65, compareAtPrice: 80, rating: { average: 4.7, count: 89 },
    description: 'A six-panel brushed wool cap with an embroidered tonal monogram and brass eyelets.',
    shortDescription: 'Six-panel brushed wool, brass eyelets.', image: IMG('photo-1521369909029-2afed882baee'), featured: true,
  },
  {
    name: 'Heritage Leather Belt', category: 'accessories', price: 95, rating: { average: 4.8, count: 124 },
    description: 'A 30mm vegetable-tanned leather belt with a solid brass buckle, cut and edged by hand.',
    shortDescription: 'Vegetable-tanned leather, solid brass.', image: IMG('photo-1553062407-98eeb64c6a62'),
  },
];

const COLLECTIONS = [
  {
    name: 'New Season', slug: 'new-season', featured: true,
    shortDescription: 'The first chapter of the season', description: 'Fresh silhouettes arriving now.',
    image: IMG('photo-1490481651871-ab68de25d43d', 1400),
  },
  {
    name: 'The Essentials', slug: 'essentials',
    shortDescription: 'The foundations of the wardrobe', description: 'Timeless staples, perfected.',
    image: IMG('photo-1445205170230-053b83016050', 1400),
  },
  {
    name: 'Autumn–Winter 2026', slug: 'autumn-winter-2026',
    shortDescription: 'The current season', description: 'Layers, drape and quiet richness.',
    image: IMG('photo-1483985988355-763728e1935b', 1400),
  },
  {
    name: 'Icons', slug: 'icons', featured: true,
    shortDescription: 'Most-loved pieces', description: 'The pieces the maison is known for.',
    image: IMG('photo-1434389677669-e08b4cac3105', 1400),
  },
];

const REVIEWS = [
  { rating: 5, title: 'The perfect oversized tee', comment: 'The drape is immaculate — heavy cotton that falls beautifully. This is the tee I reach for every day.', helpfulVotes: 42 },
  { rating: 5, title: 'Tailoring at another level', comment: 'The wide leg is pure architecture. Compliments every single time I wear them.', helpfulVotes: 38 },
  { rating: 4, title: 'Quiet luxury, done right', comment: 'Understated, impeccable finishing. Runs slightly generous — size down for a sharper line.', helpfulVotes: 27 },
  { rating: 5, title: 'The hoodie everyone asks about', comment: 'Heavyweight without being stiff. The boxy cut and gold-tipped cords make it feel special.', helpfulVotes: 51 },
  { rating: 5, title: 'Sneaker perfection', comment: 'Full-grain leather, cushioned sole, zero branding — exactly the restraint I look for.', helpfulVotes: 33 },
  { rating: 4, title: 'A shacket for every season', comment: 'The brushed wool is substantial. Layers beautifully over knits and tees.', helpfulVotes: 19 },
];

const DEMO_USER = {
  firstName: 'Elena',
  lastName: 'Harper',
  email: 'elena.harper@example.com',
  password: 'Demo@12345',
  role: 'customer',
  status: 'active',
};

const SETTINGS_DATA = {
  announcement: {
    enabled: true,
    messages: [
      'Complimentary shipping on orders over $100',
      'New season, new silhouettes',
      'Luxury redefined',
      'Free returns within 30 days',
    ],
  },
  homepageSections: [
    {
      type: 'hero',
      sortOrder: 1,
      isActive: true,
      props: {
        eyebrow: 'The Autumn–Winter 2026 Collection',
        headingLine1: 'Silhouettes in',
        headingLine2: 'whispers of gold',
        subheading: 'Crafted from rare fabrics and precise tailoring — BRISTI dresses the art of quiet luxury. Each piece, a study in restraint.',
        image: IMG('photo-1490481651871-ab68de25d43d', 1920),
        primaryCta: { label: 'Explore the collection', to: '/collections' },
        secondaryCta: { label: 'Shop new arrivals', to: '/shop' },
      },
    },
    {
      type: 'campaign-banner',
      sortOrder: 6,
      isActive: true,
      props: {
        eyebrow: 'The New Season',
        title: 'Autumn–Winter 2026',
        description: 'Layered volumes, brushed wools and a palette of black, ivory and gold. The season begins now.',
        image: IMG('photo-1483985988355-763728e1935b', 1920),
        cta: { label: 'Discover the collection', to: '/collections' },
      },
    },
  ],
};

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const COLORS: Record<string, string[]> = {
  'Oversized T-Shirts': ['Black', 'Ivory', 'Sand'],
  'Japanese Trouser': ['Black', 'Charcoal', 'Stone'],
  'Gurkha Pant': ['Sand', 'Ivory'],
  'Shackets': ['Camel', 'Charcoal', 'Black'],
  'Premium Shirts': ['White', 'Ivory', 'Stone'],
  'Luxury Hoodies': ['Black', 'Heather Grey', 'Charcoal'],
  'Cargo Pants': ['Olive', 'Black', 'Sand'],
  'Sneakers': ['White', 'Black', 'Ivory'],
  'Accessories': ['Black', 'Tan'],
};

async function run() {
  const uri = await getMongoUri();
  await mongoose.connect(uri);
  console.log(`Seeding into: ${uri}`);

  const categoryMap = new Map<string, any>();
  for (const cat of CATEGORIES) {
    let existing = await CategoryModel.findOne({ slug: cat.slug });
    if (existing) {
      categoryMap.set(cat.slug, existing);
      continue;
    }
    const created = await CategoryModel.create({ ...cat, level: 1, sortOrder: categoryMap.size, isActive: true });
    categoryMap.set(cat.slug, created);
    console.log(`Category created: ${cat.name}`);
  }

  let demoUser: any = await UserModel.findOne({ email: DEMO_USER.email });
  if (!demoUser) {
    demoUser = await UserModel.create(DEMO_USER);
    console.log(`Demo user created: ${DEMO_USER.email}`);
  }

  const collectionMap = new Map<string, any>();
  for (const col of COLLECTIONS) {
    let existing = await CollectionModel.findOne({ slug: col.slug });
    if (existing) {
      collectionMap.set(col.slug, existing);
      continue;
    }
    const created = await CollectionModel.create({
      ...col,
      products: [],
      isActive: true,
    });
    collectionMap.set(col.slug, created);
    console.log(`Collection created: ${col.name}`);
  }

  const productIds: any[] = [];
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    let existing = await ProductModel.findOne({ slug });
    if (existing) {
      productIds.push(existing._id);
      continue;
    }
    const category = categoryMap.get(p.category);
    if (!category) continue;

    const sku = `BRS-${slug.toUpperCase().slice(0, 12)}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const colors = COLORS[p.category] || ['Black'];
    const isFootwear = p.category === 'Sneakers';

    const options = isFootwear
      ? [{ name: 'Color', values: colors }, { name: 'Size', values: ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'] }]
      : [{ name: 'Color', values: colors }, { name: 'Size', values: SIZES }];

    const sizeValues = options[1].values;
    const variants = [];
    for (const color of colors) {
      for (const size of sizeValues) {
        variants.push({
          id: `${slug}-${color.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${size.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: `${color} / ${size}`,
          options: { Color: color, Size: size },
          priceAdjustment: 0,
          sku: `${sku}-${variants.length + 1}`,
          stock: Math.floor(Math.random() * 30) + 6,
        });
      }
    }

    const product = await ProductModel.create({
      ...p,
      slug,
      category: category._id,
      brand: 'BRISTI',
      sku,
      weight: Math.floor(Math.random() * 600) + 200,
      dimensions: { length: 30, width: 22, height: 4 },
      stock: variants.reduce((sum, v) => sum + v.stock, 0),
      trackQuantity: true,
      allowBackorder: false,
      lowStockThreshold: 5,
      images: [{ url: p.image, alt: p.name, isFeatured: true }],
      options,
      variants,
      tags: p.tags || [],
      featured: !!p.featured,
      status: 'active',
      seo: { title: `${p.name} | BRISTI`, description: p.shortDescription },
    });
    productIds.push(product._id);
    console.log(`Product created: ${p.name}`);
  }

  const collectionAssignments: Array<[string, string]> = [
    ['new-season', 'Oversized T-Shirts'], ['new-season', 'Premium Shirts'], ['new-season', 'Luxury Hoodies'], ['new-season', 'Sneakers'],
    ['essentials', 'Oversized T-Shirts'], ['essentials', 'Premium Shirts'], ['essentials', 'Japanese Trouser'], ['essentials', 'Sneakers'],
    ['autumn-winter-2026', 'Shackets'], ['autumn-winter-2026', 'Gurkha Pant'], ['autumn-winter-2026', 'Japanese Trouser'], ['autumn-winter-2026', 'Cargo Pants'], ['autumn-winter-2026', 'Luxury Hoodies'], ['autumn-winter-2026', 'Accessories'],
    ['icons', 'Luxury Hoodies'], ['icons', 'Japanese Trouser'], ['icons', 'Sneakers'], ['icons', 'Oversized T-Shirts'],
  ];
  for (const [colSlug, catName] of collectionAssignments) {
    const col = collectionMap.get(colSlug);
    const cat = categoryMap.get(catName.toLowerCase().replace(/ /g, '-'));
    if (!col || !cat) continue;
    const products = await ProductModel.find({ category: cat._id, status: 'active' });
    for (const product of products) {
      if (!col.products.some((id: any) => id.toString() === product._id.toString())) {
        col.products.push(product._id);
      }
    }
  }
  for (const col of collectionMap.values()) {
    await col.save();
  }
  console.log('Collections populated with products.');

  for (const r of REVIEWS) {
    const product = await ProductModel.findOne({ 'rating.average': { $gte: 4 } }).skip(0).exec();
    const anyProducts = await ProductModel.find({ status: 'active' });
    const target = anyProducts[REVIEWS.indexOf(r) % anyProducts.length];
    if (!target) continue;
    const existing = await ReviewModel.findOne({ productId: target._id, userId: demoUser._id });
    if (existing) continue;
    await ReviewModel.create({
      productId: target._id,
      userId: demoUser._id,
      userName: DEMO_USER.firstName + ' ' + DEMO_USER.lastName,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: true,
      helpfulVotes: r.helpfulVotes,
      status: 'approved',
    });
  }
  console.log('Demo reviews created.');

  const existingSettings = await SettingsModel.findOne({});
  if (existingSettings) {
    if (!existingSettings.announcement?.messages?.length) {
      existingSettings.announcement = SETTINGS_DATA.announcement;
    }
    if (!existingSettings.homepageSections?.length) {
      existingSettings.homepageSections = SETTINGS_DATA.homepageSections;
    }
    await existingSettings.save();
  } else {
    await SettingsModel.create({ ...SETTINGS_DATA, brandName: 'BRISTI' });
  }
  console.log('Settings seeded (announcement + homepage sections).');

  await mongoose.disconnect();
  await stopMemoryMongo();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
