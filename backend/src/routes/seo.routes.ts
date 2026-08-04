import { Router } from 'express';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { BlogPostRepository } from '../repositories/blogpost.repository';
import { PageRepository } from '../repositories/page.repository';
import { asyncHandler } from '../middleware/async';

const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();
const collectionRepo = new CollectionRepository();
const blogRepo = new BlogPostRepository();
const pageRepo = new PageRepository();

const BASE_URL = process.env.BASE_URL || 'https://bristi.example.com';

const router = Router();

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const now = new Date().toISOString();
    const staticUrls = [
      '', '/shop', '/about', '/contact', '/faq', '/wishlist', '/account', '/cart', '/checkout',
    ].map((p) => `  <url><loc>${BASE_URL}${p}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);

    const [products, categories, collections, blogs, pages] = await Promise.all([
      productRepo.findMany({ status: 'active' }, { select: 'slug updatedAt' }),
      categoryRepo.findMany({ isActive: true }, { select: 'slug updatedAt' }),
      collectionRepo.findMany({ isActive: true }, { select: 'slug updatedAt' }),
      blogRepo.findMany({ status: 'published' }, { select: 'slug updatedAt' }),
      pageRepo.findMany({ status: 'published' }, { select: 'slug updatedAt' }),
    ]);

    const productUrls = products.map(
      (p: any) => `  <url><loc>${BASE_URL}/product/${xmlEscape(p.slug)}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
    );
    const categoryUrls = categories.map(
      (c: any) => `  <url><loc>${BASE_URL}/category/${xmlEscape(c.slug)}</loc><lastmod>${new Date(c.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
    const collectionUrls = collections.map(
      (c: any) => `  <url><loc>${BASE_URL}/collection/${xmlEscape(c.slug)}</loc><lastmod>${new Date(c.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
    const blogUrls = blogs.map(
      (b: any) => `  <url><loc>${BASE_URL}/blog/${xmlEscape(b.slug)}</loc><lastmod>${new Date(b.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`
    );
    const pageUrls = pages.map(
      (p: any) => `  <url><loc>${BASE_URL}/page/${xmlEscape(p.slug)}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...productUrls, ...categoryUrls, ...collectionUrls, ...blogUrls, ...pageUrls].join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  })
);

router.get(
  '/robots.txt',
  asyncHandler(async (_req, res) => {
    const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /checkout
Disallow: /account

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.set('Content-Type', 'text/plain');
    res.send(robots);
  })
);

export default router;
