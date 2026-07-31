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

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Most coveted"
          title="Best Sellers"
          description="The pieces the maison is known for — reordered again and again."
          link={{ label: 'Shop best sellers', to: '/shop' }}
        />
        <div className="mt-14">
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
