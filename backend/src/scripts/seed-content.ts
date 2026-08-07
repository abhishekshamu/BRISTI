import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BlogPostModel } from '../models/BlogPost';
import { FAQModel } from '../models/FAQ';
import { PageModel } from '../models/Page';
import { UserModel } from '../models/User';
import { getMongoUri, stopMemoryMongo } from '../config/database';

dotenv.config();

const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const BLOG_POSTS = [
  {
    title: 'The Anatomy of Quiet Luxury',
    excerpt: 'How restraint became the most expensive thing in fashion — and why BRISTI builds every piece around it.',
    content: '<p>Quiet luxury is not a trend; it is a discipline. It begins with fabric — the weight of a wool, the hand of a cotton — and ends with the small details that never announce themselves: a tonal stitch, a hidden placket, a lining in a colour only you will ever see.</p><p>At BRISTI, every garment passes through twelve hands before it reaches you. Each one is trained to look for what is missing rather than what is added. The result is a wardrobe that reads as effortless and is anything but.</p>',
    author: 'The Atelier',
    tags: ['craft', 'philosophy', 'fabric'],
    category: 'Craft',
    featured: true,
    featuredImage: IMG('photo-1490481651871-ab68de25d43d'),
  },
  {
    title: 'A Guide to Japanese Twill',
    excerpt: 'From the shuttle looms of Okayama to your wardrobe — the story of the cloth behind our favourite trousers.',
    content: '<p>Japanese twill is woven slowly, on shuttle looms that produce cloth with a soft, irregular hand that mass-produced mills cannot replicate. The slow weave traps air between the threads, giving the fabric its characteristic drape and breathability.</p><p>Our Kyoto Wide-Leg Trouser is cut from a brushed version of this cloth, so it falls in a single unbroken line from hip to hem. It is the closest thing tailoring has to a quiet statement.</p>',
    author: 'The Atelier',
    tags: ['fabric', 'tailoring', 'trousers'],
    category: 'Fabric',
    featured: false,
    featuredImage: IMG('photo-1584865288642-42078afe6942'),
  },
  {
    title: 'The Return of the Gurkha Pant',
    excerpt: 'A hundred-year-old silhouette finds its way back into the modern wardrobe.',
    content: '<p>The Gurkha waist was born in the barracks of the British Indian Army, where a side-tab closure replaced the belt for a cleaner line under a tunic. The detail disappeared for decades, resurfacing only in the most careful tailoring houses.</p><p>We reimagined it in crisp cotton-twill with a double forward slant pocket — practical, precise, and unmistakably quiet.</p>',
    author: 'The Atelier',
    tags: ['heritage', 'tailoring', 'pants'],
    category: 'Heritage',
    featured: false,
    featuredImage: IMG('photo-1594633312681-425c7b97ccd1'),
  },
  {
    title: 'Heavyweight Fleece: Why 480gsm Matters',
    excerpt: 'The science of a hoodie that holds its shape for years, not seasons.',
    content: '<p>Most hoodies are knit at 280–350 grams per square metre. Ours are knit at 480. That extra weight is not for warmth alone — it changes how the garment drapes, how it survives the wash, and how it ages.</p><p>Loopback fleece is brushed on the inside to trap air, while the outer face stays smooth and dense. The result is a hoodie that stands up on its own, yet softens beautifully with every wear.</p>',
    author: 'The Atelier',
    tags: ['fabric', 'knitwear', 'hoodies'],
    category: 'Fabric',
    featured: false,
    featuredImage: IMG('photo-1512374382149-233c42b6a83b'),
  },
  {
    title: 'How to Build a Capsule Wardrobe',
    excerpt: 'Sixteen pieces, four seasons, zero compromise — the BRISTI approach to a considered closet.',
    content: '<p>A capsule wardrobe is not about fewer clothes; it is about more considered ones. Begin with the anchor pieces — the trousers and coats that carry the season — then add shirts and knitwear that layer beneath them.</p><p>Choose a palette of black, ivory, sand and stone, and let texture do the work of colour. When every piece shares a palette, everything goes with everything, and dressing becomes a matter of seconds.</p>',
    author: 'Elena Harper',
    tags: ['style', 'wardrobe', 'guide'],
    category: 'Style',
    featured: false,
    featuredImage: IMG('photo-1445205170230-053b83016050'),
  },
  {
    title: 'Behind the Seam: The Atelier Process',
    excerpt: 'Twelve hands, forty-two steps and one uncompromising standard — inside the BRISTI workshop.',
    content: '<p>Every BRISTI piece begins as a paper pattern, adjusted across three fittings on a living mannequin before a single panel is cut. The cloth rests for 48 hours before cutting, so it does not move once stitched.</p><p>Each garment then passes through inspection stations — one for seams, one for buttons, one for finish — before a final review under daylight. Only pieces that pass every station receive the label.</p>',
    author: 'The Atelier',
    tags: ['craft', 'process', 'atelier'],
    category: 'Craft',
    featured: false,
    featuredImage: IMG('photo-1483985988355-763728e1935b'),
  },
];

const FAQS = [
  { question: 'How do I find my size?', answer: 'Every product page includes a detailed size guide with measurements for each garment. When in doubt, our concierge can help you choose the perfect fit.', category: 'Orders', sortOrder: 1 },
  { question: 'Can I track my order?', answer: 'Yes. Once your order ships you will receive tracking details by email, and you can follow progress from your account dashboard or the Track Order page.', category: 'Shipping', sortOrder: 2 },
  { question: 'How long does delivery take?', answer: 'Standard delivery takes 2–4 business days. Express delivery is available at checkout and takes 1–2 business days. International deliveries take 5–10 business days depending on destination.', category: 'Shipping', sortOrder: 3 },
  { question: 'Is shipping free?', answer: 'Shipping is complimentary on all orders over $100. Orders below this threshold incur a flat shipping fee of $15, charged at checkout.', category: 'Shipping', sortOrder: 4 },
  { question: 'What is the returns policy?', answer: 'We accept returns within 30 days of delivery. Items must be unworn, unwashed and returned with all original tags and packaging. A prepaid return label is provided for standard returns.', category: 'Returns', sortOrder: 5 },
  { question: 'How long do refunds take?', answer: 'Refunds are issued to the original payment method within 5–7 business days of receiving your return.', category: 'Returns', sortOrder: 6 },
  { question: 'Can I exchange an item?', answer: 'Exchanges are treated as a return plus a new order, ensuring you receive your new size or piece as quickly as possible.', category: 'Returns', sortOrder: 7 },
  { question: 'Which payment methods do you accept?', answer: 'We accept all major credit and debit cards, as well as UPI and net banking via our partners. Payments are processed with industry-standard encryption.', category: 'Payments', sortOrder: 8 },
  { question: 'Are my payment details secure?', answer: 'Payments are processed by trusted third-party providers (Stripe and Razorpay) using industry-standard encryption. Card details are never stored on our servers.', category: 'Payments', sortOrder: 9 },
  { question: 'How do I care for my pieces?', answer: 'Care instructions are printed on each garment label. As a rule, our pieces prefer gentle handling — cool water, mild detergent and air-drying. Never tumble-dry wool or brushed cottons.', category: 'Care', sortOrder: 10 },
  { question: 'Do you offer gift wrapping?', answer: 'We do. Add a note at checkout and our atelier will wrap your pieces in our signature packaging, ready to gift.', category: 'Orders', sortOrder: 11 },
  { question: 'How can I contact the maison?', answer: 'Our contact details are listed on the Contact page. We respond within 24 hours.', category: 'Contact', sortOrder: 12 },
];

const PAGES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    excerpt: 'How BRISTI collects, uses and protects your personal data.',
    content: '<h2>1. What we collect</h2><p>We collect the information you provide when placing an order or creating an account: name, email address, shipping and billing address, phone number and order history. Payment details are handled by our payment providers and are never stored on our servers.</p><h2>2. How we use it</h2><p>Your data is used to process orders, deliver purchases, provide customer support, and — with your consent — send updates about new collections. We never sell personal data to third parties.</p><h2>3. Your rights</h2><p>You may request a copy of your data, correct inaccuracies, or ask us to delete your account and data at any time by contacting us through the Contact page.</p><h2>4. Cookies</h2><p>We use essential cookies to keep your cart and session working. Analytics and marketing cookies are only set with your consent.</p><h2>5. Contact</h2><p>For any privacy questions, contact us via the Contact page.</p>',
    seo: { title: 'Privacy Policy | BRISTI', description: 'How BRISTI collects, uses and protects your personal data.' },
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    excerpt: 'The terms governing your use of the BRISTI store.',
    content: '<h2>1. Agreement</h2><p>By using this store you agree to these terms. We may update them from time to time; continued use of the store constitutes acceptance of the updated terms.</p><h2>2. Orders</h2><p>All orders are subject to availability and confirmation of the price. We reserve the right to cancel any order for fraud prevention or pricing errors.</p><h2>3. Pricing</h2><p>Prices are displayed in the store currency and include applicable taxes unless stated otherwise at checkout.</p><h2>4. Intellectual property</h2><p>All content on this store — designs, text, imagery — is the property of BRISTI and may not be reproduced without written permission.</p>',
    seo: { title: 'Terms of Service | BRISTI', description: 'The terms governing your use of the BRISTI store.' },
  },
  {
    slug: 'shipping',
    title: 'Shipping & Delivery',
    excerpt: 'Delivery times and costs for every destination.',
    content: '<h2>Standard delivery</h2><p>Standard delivery takes 2–4 business days within the USA. International deliveries take 5–10 business days depending on destination.</p><h2>Express delivery</h2><p>Express delivery is available at checkout and takes 1–2 business days.</p><h2>Shipping costs</h2><p>Shipping is complimentary on all orders over $100. Orders below this threshold incur a flat shipping fee of $15, charged at checkout.</p><h2>Tracking</h2><p>Once your order ships you will receive tracking details by email, and you can follow progress from your account dashboard or the Track Order page.</p>',
    seo: { title: 'Shipping & Delivery | BRISTI', description: 'Delivery times and costs for every destination.' },
  },
  {
    slug: 'refund',
    title: 'Returns & Refunds',
    excerpt: 'Our 30-day returns policy, step by step.',
    content: '<h2>Returns window</h2><p>We accept returns within 30 days of delivery. Items must be unworn, unwashed and returned with all original tags and packaging.</p><h2>How to return</h2><p>Start a return from your account dashboard or by contacting us through the Contact page. A prepaid return label is provided for standard returns.</p><h2>Refunds</h2><p>Refunds are issued to the original payment method within 5–7 business days of receiving your return.</p><h2>Exchanges</h2><p>Exchanges are treated as a return plus a new order, ensuring you receive your new size or piece as quickly as possible.</p>',
    seo: { title: 'Returns & Refunds | BRISTI', description: 'Our 30-day returns policy, step by step.' },
  },
  {
    slug: 'contact',
    title: 'Contact the Maison',
    excerpt: 'Questions, commissions or private appointments.',
    content: '<p>We would love to hear from you. Send us a message through the form, and we will respond within 24 hours.</p>',
    seo: { title: 'Contact | BRISTI', description: 'Questions, commissions or private appointments.' },
  },
  {
    slug: 'about',
    title: 'About BRISTI',
    excerpt: 'A maison built on restraint, precision and rare fabrics.',
    content: '<p>BRISTI is a luxury clothing brand defined by what it leaves out. Every piece is cut from rare fabrics, constructed with precision tailoring, and finished to a standard that does not announce itself.</p><p>Our atelier runs on a simple belief: a wardrobe should be built slowly, from a few exceptional pieces rather than many ordinary ones.</p>',
    seo: { title: 'About | BRISTI', description: 'A maison built on restraint, precision and rare fabrics.' },
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    excerpt: 'Answers to the questions we hear most often.',
    content: '<p>Browse the FAQ sections below for answers to common questions about orders, shipping, returns, payments and care. Can\'t find what you need? Contact us.</p>',
    seo: { title: 'FAQs | BRISTI', description: 'Answers to the questions we hear most often.' },
  },
];

async function run() {
  const alreadyConnected = mongoose.connection.readyState === 1;
  const uri = await getMongoUri();
  if (!alreadyConnected) await mongoose.connect(uri);
  console.log(`Seeding content into: ${uri}`);

  let createdBlogs = 0;
  for (const post of BLOG_POSTS) {
    const existing = await BlogPostModel.findOne({ slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') });
    if (existing) continue;
    await BlogPostModel.create({
      ...post,
      status: 'published',
      publishedAt: new Date(),
      seo: { title: `${post.title} | BRISTI`, description: post.excerpt },
    });
    createdBlogs++;
    console.log(`Blog post created: ${post.title}`);
  }
  console.log(`Blog posts seeded (${createdBlogs} created).`);

  let createdFaqs = 0;
  for (const faq of FAQS) {
    const existing = await FAQModel.findOne({ question: faq.question });
    if (existing) continue;
    await FAQModel.create({ ...faq, isActive: true });
    createdFaqs++;
    console.log(`FAQ created: ${faq.question}`);
  }
  console.log(`FAQs seeded (${createdFaqs} created).`);

  const author = await UserModel.findOne({}).sort({ createdAt: 1 });
  if (author) {
    let createdPages = 0;
    for (const page of PAGES) {
      const existing = await PageModel.findOne({ slug: page.slug });
      if (existing) continue;
      await PageModel.create({
        ...page,
        content: page.content,
        status: 'published',
        createdBy: author._id,
      });
      createdPages++;
      console.log(`Page created: ${page.slug}`);
    }
    console.log(`Pages seeded (${createdPages} created).`);
  } else {
    console.warn('No user found — skipping page seeding (pages require a createdBy user).');
  }

  if (!alreadyConnected) {
    await mongoose.disconnect();
    await stopMemoryMongo();
  }
  console.log('Content seed complete.');
}

export { run };

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
