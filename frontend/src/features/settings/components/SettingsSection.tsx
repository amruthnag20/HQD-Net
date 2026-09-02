import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="w-full flex flex-col h-full"
    >
      <div className="mb-10 pb-6 border-b border-line">
        <h2 className="font-display text-4xl text-primary tracking-wide uppercase">{title}</h2>
        {description && (
          <p className="mt-4 font-sans text-sm text-secondary max-w-xl">
            {description}
          </p>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-12 pb-24">
        {children}
      </div>
    </motion.div>
  )
}
