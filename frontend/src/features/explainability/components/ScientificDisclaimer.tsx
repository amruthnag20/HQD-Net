import { Info } from 'lucide-react'

/**
 * The one scientific-honesty disclaimer for this page. Previously this same
 * note was duplicated across four separate components; centralizing it keeps
 * the message consistent and stops it from crowding out real content.
 */
export function ScientificDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-line-subtle bg-surface-subtle px-4 py-3 text-xs leading-relaxed text-secondary">
      <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
      <p>
        These explanations describe model behavior, not clinical causality. Feature attributions and
        sensitivity values show how the model responded to the input — they don't establish that a
        biomarker causes disease, and model probability is not a diagnosis.
      </p>
    </div>
  )
}
