import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { SectionHeading } from '@/components/shared/SectionHeading';

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
  const gallery = (props?.images ?? []).filter((image): image is { image: string; alt?: string } => Boolean(image.image));
  if (gallery.length === 0) return null;

  const heading = props?.title || 'The Instagram';

  return (
    <section className="bg-secondary/40 pt-12 pb-12 sm:pb-20">
      <div className="container-lux">
        <SectionHeading
          eyebrow={props?.eyebrow}
          title={heading}
          description={props?.description}
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {gallery.map((item, index) => {
            const content = (
              <>
                <img
                  src={item.image}
                  alt={item.alt || 'Instagram post'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--image-overlay)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Instagram className="h-5 w-5 text-[var(--on-ink)]" />
                </div>
              </>
            );
            const className = 'group relative block aspect-square overflow-hidden bg-secondary';
            return props?.url ? (
              <motion.a
                key={item.image + index}
                href={props.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open Instagram post: ${item.alt || 'Instagram post'}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className={className}
              >
                {content}
              </motion.a>
            ) : (
              <motion.div
                key={item.image + index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className={className}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
