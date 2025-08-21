'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ModernBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const badgeVariants = {
  default: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  secondary: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function ModernBadge({
  children,
  variant = 'default',
  size = 'md',
  animate = true,
  className = '',
}: ModernBadgeProps) {
  const Component = animate ? motion.span : 'span';

  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'transition-all duration-200',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...(animate && {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        transition: { duration: 0.1 },
      })}
    >
      {children}
    </Component>
  );
}

interface StatusBadgeProps {
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    confirmed: {
      variant: 'success' as const,
      icon: <CheckCircleIcon className="w-4 h-4" />,
      label: 'Confirmed',
    },
    pending: {
      variant: 'warning' as const,
      icon: <InformationCircleIcon className="w-4 h-4" />,
      label: 'Pending',
    },
    cancelled: {
      variant: 'error' as const,
      icon: <XCircleIcon className="w-4 h-4" />,
      label: 'Cancelled',
    },
    completed: {
      variant: 'info' as const,
      icon: <CheckCircleIcon className="w-4 h-4" />,
      label: 'Completed',
    },
  };

  const config = statusConfig[status];

  return (
    <ModernBadge variant={config.variant} size={size}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </ModernBadge>
  );
}

export function PriceBadge({
  amount,
  currency = 'INR',
  size = 'md',
  highlight = false,
}: {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
}) {
  return (
    <ModernBadge
      variant={highlight ? 'success' : 'default'}
      size={size}
      className={highlight ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' : ''}
    >
      <span className="font-bold">
        {new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
        }).format(amount)}
      </span>
    </ModernBadge>
  );
}
