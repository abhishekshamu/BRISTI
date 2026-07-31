import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Hand, Scissors, Gem } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { usePageMeta } from '@/lib/seo';

const VALUES = [
  { icon: Compass, title: 'Heritage', description: 'Founded on the conviction that true luxury is timeless — not seasonal.' },
  { icon: Scissors, title: 'Craft', description: 'Two hundred artisan hands shape every piece, from first sketch to final seam.' },
  { icon: Gem, title: 'Rare materials', description: 'Mongolian cashmere, mulberry silk and heritage wool, sourced with respect.' },
  { icon: Hand, title: 'Responsibility', description: 'Conscious production, honest pricing and packaging designed to be kept.' },
];

export default function AboutPage() {
  usePageMeta({
    title: 'About BRISTI — Luxury Redefined',
    description: 'The story of BRISTI — a luxury clothing maison devoted to timeless elegance, masterful tailoring and quiet sophistication.',
  });

  return (
    <>
      <PageHeader
        eyebrow="The Maison"
        title="About BRISTI"
        description="We believe luxury should be felt, not shouted. BRISTI is a study in restraint — silhouettes, fabrics and finishes that speak softly and last decades."
        breadcrumb={[{ label: 'About' }]}
      />

      <section className="bg-background py-16 sm:py-24">
        <div className="container-lux">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              className="relative aspect-[4/5] overflow-hidden bg-secondary"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-6xl tracking-[0.35em] text-white/15">BRISTI</span>
              </div>
              <div className="absolute bottom-8 left-8 right-8 flex items-center gap-4 border border-white/15 bg-black/40 p-6 backdrop-blur">
                <span className="flex h-12 w-12 items-center justify-center border border-accent/50 text-accent">
                  <Gem className="h-5 w-5" />
                </span>
                <p className="text-sm leading-6 text-white/70">
                  "Elegance is refusal." — <span className="text-white">The founding principle of the maison.</span>
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-8"
            >
              <span className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">Our story</span>
              <h2 className="font-display text-4xl font-medium leading-tight lg:text-5xl">
                Born of a quiet rebellion against <em className="text-gradient-gold not-italic">loud luxury</em>
              </h2>
              <div className="flex flex-col gap-5 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                <p>
                  BRISTI began in a single atelier with a simple question: what if luxury focused on the wearer instead of the label? What if a garment's worth was measured in how it feels — against skin, through a day, across a decade?
                </p>
                <p>
                  Our collections are designed slowly and made deliberately. Fabrics are sourced from mills that have perfected their craft for generations. Patterns are cut by hand, seams are finished by hand, and every piece is inspected as if it were the only one.
                </p>
                <p>
                  The result is a wardrobe without seasons — pieces that outlive trends and become part of the person wearing them.
                </p>
              </div>
              <Link to="/collections" className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-lux-sm text-foreground transition-colors hover:text-accent">
                Explore the collections <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-16 sm:py-24">
        <div className="container-lux">
          <SectionHeading dark eyebrow="What we stand for" title="The values of the maison" />
          <div className="mt-14 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex flex-col gap-5 bg-[#0a0a0a] p-8"
              >
                <Icon className="h-7 w-7 text-accent" />
                <h3 className="font-display text-2xl font-medium text-white">{title}</h3>
                <p className="text-sm leading-7 text-white/60">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-24">
        <div className="container-lux text-center">
          <SectionHeading eyebrow="Join us" title="Become part of the story" description="First access to collections, atelier stories and invitations reserved for members." />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="btn-lux-primary">Create your account</Link>
            <Link to="/contact" className="btn-lux-outline">Contact the maison</Link>
          </div>
        </div>
      </section>
    </>
  );
}
