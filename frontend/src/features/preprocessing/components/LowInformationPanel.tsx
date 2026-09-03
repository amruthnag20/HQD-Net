import { useMemo } from 'react'
import { Fingerprint, MinusCircle } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import type { DatasetState } from '@/features/ingestion/types/dataset'
import { usePreprocessing } from '../hooks/usePreprocessing'

type Props = { dataset: DatasetState }

/** Surfaces identifiers (section 10) and constant/empty columns (section
 *  11) explicitly — both are excluded from model features by default, and
 *  identifiers/constants can be overridden back in via their checkbox. */
export function LowInformationPanel({ dataset }: Props) {
  const { config, actions } = usePreprocessing()

  const identifiers = useMemo(
    () => dataset.identifierColumns.filter((n) => n !== dataset.targetColumn),
    [dataset.identifierColumns, dataset.targetColumn],
  )
  const lowInformation = useMemo(
    () => [...dataset.constantColumns, ...dataset.emptyColumns].filter((n) => n !== dataset.targetColumn),
    [dataset.constantColumns, dataset.emptyColumns, dataset.targetColumn],
  )

  if (identifiers.length === 0 && lowInformation.length === 0) return null

  const isIncluded = (name: string) => config.featureOverrides[name] === true

  return (
    <Panel eyebrow="Identifier & Low-Information Detection" title="Excluded by default">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {identifiers.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Fingerprint className="size-3.5" />
              Identifier detected
            </div>
            <ul className="flex flex-col gap-1.5">
              {identifiers.map((name) => (
                <li key={name} className="flex items-center justify-between rounded-lg bg-surface-subtle px-2.5 py-1.5">
                  <span className="font-mono text-xs text-primary">{name}</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isIncluded(name)}
                      onChange={(e) =>
                        e.target.checked
                          ? actions.setFeatureIncluded(name, true)
                          : actions.clearFeatureOverride(name)
                      }
                      aria-label={`Override exclusion of identifier ${name}`}
                      className="size-3.5 accent-[var(--color-accent)]"
                    />
                    <span className="text-xs text-muted">include anyway</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowInformation.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
              <MinusCircle className="size-3.5" />
              Low-information features
            </div>
            <ul className="flex flex-col gap-1.5">
              {lowInformation.map((name) => {
                const isEmpty = dataset.emptyColumns.includes(name)
                return (
                  <li key={name} className="flex items-center justify-between rounded-lg bg-surface-subtle px-2.5 py-1.5">
                    <span className="font-mono text-xs text-primary">{name}</span>
                    {isEmpty ? (
                      <span className="text-xs text-disabled">no data</span>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isIncluded(name)}
                          onChange={(e) =>
                            e.target.checked
                              ? actions.setFeatureIncluded(name, true)
                              : actions.clearFeatureOverride(name)
                          }
                          aria-label={`Override exclusion of constant feature ${name}`}
                          className="size-3.5 accent-[var(--color-accent)]"
                        />
                        <span className="text-xs text-muted">include anyway</span>
                      </label>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
}
