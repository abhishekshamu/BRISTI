import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/services/catalog.service';
import { getImageUrl } from '@/lib/utils';
import type { Collection } from '@shared/types';

export function EditorialBanner() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  const { data: collections } = useQuery({
    queryKey: ['collections', 'current'],
    queryFn: catalogService.currentCollections,
    staleTime: 1000 * 60 * 30,
  });

  const collection = (collections ?? [])[0] as Collection | undefined;
  const image = getImageUrl(collection?.image ?? collection?.bannerImage);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0a0a0a]">
      <div className="grid min-h-[560px] lg:grid-cols-2">
        <div className="relative order-2 overflow-hidden lg:order-1">
          {image ? (
            <motion.img
              src={image}
              alt={collection?.name ?? 'BRISTI editorial'}
              style={{ y: imageY }}
              className="absolute inset-0 h-[120%] w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-black">
              <span className="font-display text-4xl tracking-[0.3em] text-white/20">BRISTI</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/70" />
        </div>

        <div className="relative order-1 flex items-center p-8 sm:p-16 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-xl"
          >
            <span className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux text-accent">
              <span className="h-px w-10 bg-accent" /> The Atelier Edit
            </span>
            <h2 className="font-display text-4xl font-medium leading-tight text-white sm:text-5xl lg:text-6xl">
              Where heritage meets <em className="text-gradient-gold not-italic">the future</em>
            </h2>
            <p className="mt-6 text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
              From hand-finished seams to revolutionary fabrics, every BRISTI piece travels from sketch to wardrobe through two hundred artisan hands.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/about" className="btn-lux-white">
                Our story <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/journal" className="btn-lux-outline border-white/30 text-white hover:bg-white hover:text-black">
                Read the journal
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
