import { Truck, RotateCcw, Gem, Headset } from 'lucide-react';

const VALUES = [
  { icon: Truck, title: 'Complimentary shipping', description: 'On all orders over $100, delivered worldwide' },
  { icon: RotateCcw, title: 'Effortless returns', description: '30 days to change your mind, no questions asked' },
  { icon: Gem, title: 'Atelier craftsmanship', description: 'Cut, sewn and finished by master tailors' },
  { icon: Headset, title: 'Private client care', description: 'Concierge styling advice, seven days a week' },
];

export function ValueProps() {
  return (
    <section className="border-b border-border bg-background">
      <div className="container-lux grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center border border-accent/40 text-accent">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="text-xs font-medium uppercase tracking-lux-sm">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
