import { Check, AlertTriangle, X, ArrowRight, RotateCcw } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import type { ValidationCheck, ValidationStatus } from '../types/dataset'

type Props = {
  checks: ValidationCheck[]
  status: ValidationStatus
  canContinue: boolean
  onContinue: () => void
  onReset: () => void
}

const ICON_BY_SEVERITY: Record<ValidationCheck['severity'], React.ReactNode> = {
  success: <Check className="size-3.5 text-success" />,
  warning: <AlertTriangle className="size-3.5 text-warning" />,
  error: <X className="size-3.5 text-danger" />,
}

const STATUS_COPY: Record<ValidationStatus, string> = {
  invalid: 'Not ready — resolve the errors above.',
  'valid-with-warnings': 'Dataset ready — a few columns will be handled automatically during preprocessing.',
  valid: 'Dataset ready for preprocessing.',
}

export function ValidationChecklist({ checks, status, canContinue, onContinue, onReset }: Props) {
  return (
    <Panel eyebrow="Validation" title="Dataset validation">
      <ul className="flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-sm text-secondary">
            <span className="mt-0.5 shrink-0">{ICON_BY_SEVERITY[check.severity]}</span>
            <span>{check.message}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line-subtle pt-4">
        <p className={status === 'invalid' ? 'text-sm font-medium text-danger' : 'text-sm font-medium text-secondary'}>
          {STATUS_COPY[status]}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={onReset}>
            Reset
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={!canContinue}
            rightIcon={<ArrowRight className="size-3.5" />}
            onClick={onContinue}
          >
            Continue to preprocessing
          </Button>
        </div>
      </div>
    </Panel>
  )
}
