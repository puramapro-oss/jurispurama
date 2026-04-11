'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section'
}

const variants: Variants = {
  hidden: { opacity: 0, y: 30 },
  shown: { opacity: 1, y: 0 },
}

export default function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: RevealProps) {
  const Comp = as === 'section' ? motion.section : motion.div
  return (
    <Comp
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </Comp>
  )
}
