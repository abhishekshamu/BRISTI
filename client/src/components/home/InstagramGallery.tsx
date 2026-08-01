import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { SectionHeading } from '@/components/shared/SectionHeading';

const FALLBACK_GALLERY = [
  { id: 'photo-1441986300917-64674bd600d8', alt: 'Atelier lookbook' },
  { id: 'photo-1490481651871-ab68de25d43d', alt: 'Editorial campaign' },
  { id: 'photo-1509631179647-0177331693ae', alt: 'Detail shot' },
  { id: 'photo-1483985988355-763728e1935b', alt: 'New season' },
  { id: 'photo-1434389677669-e08b4cac3105', alt: 'Layering study' },
  { id: 'photo-1445205170230-053b83016050', alt: 'The essentials' },
];

interface InstagramGalleryProps {
  props?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    url?: string;
    images?: Array<{ image?: string; alt?: string }>;
  };
}

export function InstagramGallery({ props }: InstagramGalleryProps) {
  const gallery = props?.images?.length
    ? props.images.map((image) => ({ id: image.image || '', alt: image.alt || 'Instagram post' }))
    : FALLBACK_GALLERY;

  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading
          eyebrow={props?.eyebrow || '@bristi'}
          title={props?.title || 'The Instagram'}
          description={props?.description || 'A quiet feed of fits, fabric and atelier moments.'}
        />
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {gallery.map((item, index) => (
            <motion.a
              key={item.id + index}
              href={props?.url || 'https://instagram.com'}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open Instagram post: ${item.alt}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="group relative block aspect-square overflow-hidden bg-secondary"
            >
              <img
                src={item.id.startsWith('http') ? item.id : `https://images.unsplash.com/${item.id}?q=80&w=600&auto=format&fit=crop`}
                alt={item.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Instagram className="h-5 w-5 text-white" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
