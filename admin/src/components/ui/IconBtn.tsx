import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  children: ReactNode;
}

export default function IconBtn({ title, children, className = '', ...rest }: IconBtnProps) {
  return (
    <button type="button" title={title} aria-label={title} className={`admin-icon-btn ${className}`} {...rest}>
      {children}
    </button>
  );
}
