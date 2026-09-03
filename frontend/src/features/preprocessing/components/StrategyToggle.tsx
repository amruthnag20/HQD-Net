import { SegmentedControl } from '@/components/ui/SegmentedControl'

export type StrategyOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  value: T
  options: StrategyOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

/** Labeled strategy picker for the small set of choices Phase 2 implements
 *  (imputation, encoding, scaling, ...) — built on the shared segmented
 *  control so it matches the pill-track style used everywhere else. */
export function StrategyToggle<T extends string>({ label, value, options, onChange, disabled }: Props<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <SegmentedControl
        variant="radio"
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        size="sm"
      />
    </div>
  )
}
