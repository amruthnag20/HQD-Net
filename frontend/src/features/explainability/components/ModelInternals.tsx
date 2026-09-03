import { useExplainability } from '../hooks/useExplainability'

/**
 * Compact model-internals strip. Replaces the old "Sensitivity Analysis" card
 * (which mostly rendered an always-empty sensitivity-curve placeholder plus a
 * Jacobian table that duplicated the per-row sensitivity already shown in the
 * feature signal table) and the heavily-tinted "Quantum Explainability" panel.
 * Quantum telemetry now reads as one more calm section, not a special-colored
 * callout.
 */
export function ModelInternals() {
  const { result } = useExplainability()
  const meta = result.computationalMetadata
  const hasAttributions = (result.featureAttributions?.length ?? 0) > 0
  const showSensitivityNote = hasAttributions && !result.sensitivityCurve

  if (!meta && !showSensitivityNote) return null

  const isQuantum = meta?.modelType === 'quantum'

  const fields: { label: string; value: string | number | null | undefined }[] = isQuantum
    ? [
        { label: 'Qubits', value: meta?.qubits },
        { label: 'Circuit layers', value: meta?.layers },
        { label: 'Device', value: meta?.device },
        { label: 'Precision', value: meta?.precision },
        { label: 'Execution time', value: meta?.executionMs != null ? `${meta.executionMs} ms` : null },
        { label: 'Checkpoint', value: meta?.checkpoint },
      ]
    : []

  return (
    <section aria-label="Model internals" className="rounded-2xl border border-line-subtle bg-surface p-6">
      <h2 className="text-sm font-semibold text-primary">Model internals</h2>

      {isQuantum && (
        <>
          <p className="mt-1 text-xs text-muted">Verified computational metadata from the native VQC execution.</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {fields.map(({ label, value }) =>
              value != null ? (
                <div key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-0.5 truncate font-mono text-xs font-medium text-primary">{String(value)}</p>
                </div>
              ) : null,
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            The VQC operates in its own biomarker feature space, distinct from the classical demo features —
            explanations across the two are not directly comparable.
          </p>
        </>
      )}

      {showSensitivityNote && (
        <p className={isQuantum ? 'mt-4 border-t border-line-subtle pt-4 text-xs text-muted' : 'mt-1 text-xs text-muted'}>
          Sensitivity curve (probability vs. feature-value sweep) requires backend perturbation analysis —
          not available for this execution. Per-feature sensitivity is shown in the feature signal table above.
        </p>
      )}
    </section>
  )
}
