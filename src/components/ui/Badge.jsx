import React from 'react';
import { clsx } from 'clsx';

export function Badge({ children, variant = 'gray', className = '' }) {
  const variantClass = {
    blue: 'badge-blue',
    green: 'badge-green',
    orange: 'badge-orange',
    red: 'badge-red',
    gray: 'badge-gray',
  }[variant] || 'badge-gray';

  return (
    <span className={clsx('badge', variantClass, className)}>
      {children}
    </span>
  );
}

export default Badge;
