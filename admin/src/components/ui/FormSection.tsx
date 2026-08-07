import type { ReactNode } from 'react';

interface FormSectionProps {
  number?: number;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A numbered card section used across edit forms — Stripe-style. Optional
 * index renders the gold number chip; pass no number for plain card sections.
 */
export default function FormSection({ number, title, description, children, className = '' }: FormSectionProps) {
  return (
    <section className={`admin-form-section ${className}`}>
      <header className="admin-form-section-header">
        {number !== undefined && <span className="admin-form-section-number">{number}</span>}
        <div className="min-w-0">
          <h2 className="admin-form-section-title">{title}</h2>
          {description && <p className="admin-form-section-desc">{description}</p>}
        </div>
      </header>
      <div className="admin-form-section-body">{children}</div>
    </section>
  );
}