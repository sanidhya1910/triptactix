'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  /** Cascade position; each step adds 60ms. */
  index?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'section';
}

/**
 * The single motion primitive on the site: a 12px rise plus fade as an element
 * enters, once. Its job is sequencing attention down the page, nothing more.
 * Collapses to static output under prefers-reduced-motion.
 */
export function Reveal({ children, index = 0, className, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as];

  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      // `some` rather than a fraction: a tall element (the bento cell runs 800px+)
      // can never satisfy a 25% threshold on a short viewport, which would leave it
      // stuck at opacity 0.
      viewport={{ once: true, amount: 'some', margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Comp>
  );
}
