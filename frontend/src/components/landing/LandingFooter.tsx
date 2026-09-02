import { landingCopy } from '@/content/landingCopy'

/**
 * Footer — minimal but authored.
 * Two rows: wordmark + descriptor (left) / copyright + build (right).
 * Dark canvas, thin border, mono technical metadata.
 */
export function LandingFooter() {
  return (
    <footer
      className="border-t border-line px-6 py-10 md:px-16 lg:px-24"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <div className="mx-auto flex max-w-[var(--container-max)] items-end justify-between gap-8">
        {/* Left: wordmark + descriptor */}
        <div className="flex flex-col gap-1">
          <span
            className="font-display leading-none text-primary"
            style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}
          >
            {landingCopy.footer.wordmark}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            {landingCopy.footer.descriptor}
          </span>
        </div>

        {/* Right: copyright + build info */}
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            {landingCopy.footer.copyright}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-disabled uppercase">
            {landingCopy.footer.build}
          </span>
        </div>
      </div>
    </footer>
  )
}
