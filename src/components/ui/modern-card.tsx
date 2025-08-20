'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glowOnHover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function ModernCard({
  children,
  className = '',
  hover = true,
  glowOnHover = false,
  clickable = false,
  onClick,
}: ModernCardProps) {
  const Component = clickable ? motion.button : motion.div;

  return (
    <Component
      className={cn(
        'relative bg-white rounded-2xl border border-neutral-200/60 shadow-sm',
        'transition-all duration-300',
        hover && 'hover:shadow-lg hover:shadow-neutral-200/30',
        glowOnHover && 'hover:shadow-blue-200/30',
        clickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      whileHover={hover ? { y: -2 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
    >
      {glowOnHover && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none" />
      )}
      {children}
    </Component>
  );
}

export function GlassCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        'backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl',
        'relative overflow-hidden',
        className
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <ModernCard
      className={cn('p-6 text-center group', className)}
      hover={true}
      glowOnHover={true}
    >
      <motion.div
        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white"
        whileHover={{ rotate: 5 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-neutral-600 text-sm leading-relaxed">
        {description}
      </p>
    </ModernCard>
  );
}
