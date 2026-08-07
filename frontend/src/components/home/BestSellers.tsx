import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { productService } from '@/services/product.service';
import { ProductCard, ProductGridSkeleton } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/shared/SectionHeading';

export function BestSellers() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: () => productService.bestSellers(4),
    staleTime: 1000 * 60 * 5,
  });

  const list = products ?? [];

  return (
    <section className="bg-background pt-12 pb-12 sm:pb-20">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Most coveted"
          title="Best Sellers"
          description="The pieces the maison is known for — reordered again and again."
          link={{ label: 'Shop best sellers', to: '/best-sellers' }}
        />
        <div className="mt-10">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : list.length === 0 ? (
            <p className="mx-auto max-w-md py-12 text-center text-sm leading-6 text-muted-foreground">
              The most coveted pieces are being curated. Toggle the Best Seller flag on products in the CMS
              and they will appear here instantly.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
              {list.map((product, index) => (
                <motion.div
                  key={String(product._id)}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: (index % 4) * 0.08 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
