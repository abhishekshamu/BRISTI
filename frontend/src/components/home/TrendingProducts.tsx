import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { productService } from '@/services/product.service';
import { ProductCard, ProductGridSkeleton } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/shared/SectionHeading';

export function TrendingProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'trending'],
    queryFn: () => productService.trending(4),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <section className="bg-secondary/40 pt-12 pb-12 sm:pb-20">
      <div className="container-lux">
        <SectionHeading
          eyebrow="In demand"
          title="Trending Now"
          description="What the maison's clients are talking about this season."
          link={{ label: 'Shop trending', to: '/shop' }}
        />
        <div className="mt-10">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
              {(products ?? []).map((product, index) => (
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
