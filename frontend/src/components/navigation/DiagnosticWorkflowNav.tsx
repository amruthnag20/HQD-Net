import { Link } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type DiagnosticStageId =
  | 'data'
  | 'preprocessing'
  | 'quantum'
  | 'predict'
  | 'explain'
  | 'clinical'
  | 'report'

export type DiagnosticWorkflowNavProps = {
  currentStage: DiagnosticStageId
  datasetLoaded?: boolean
  canContinue?: boolean
  className?: string
}

type StageDef = {
  id: DiagnosticStageId
  label: string
  to?: string
}

const STAGES: StageDef[] = [
  { id: 'data', label: 'Data', to: '/app/data' },
  { id: 'preprocessing', label: 'Preprocess', to: '/app/preprocessing' },
  { id: 'quantum', label: 'Model Analysis', to: '/app/model-ready' },
  { id: 'predict', label: 'Comparison', to: '/app/comparison' },
  { id: 'explain', label: 'Explain', to: '/app/explainability' },
  { id: 'clinical', label: 'Clinical', to: '/app/clinical-interpretation' },
  { id: 'report', label: 'Report', to: '/app/report' },
]

/**
 * Slim horizontal progress stepper shared by every workflow page. Deliberately
 * calm — a thin connecting rail with small nodes, not a grid of bordered boxes.
 * Same step logic as before: completed steps and the immediate next step (when
 * unlocked) are clickable; everything else is inert.
 */
export function DiagnosticWorkflowNav({
  currentStage,
  datasetLoaded = false,
  canContinue = false,
  className,
}: DiagnosticWorkflowNavProps) {
  const currentIdx = STAGES.findIndex((s) => s.id === currentStage)

  return (
    <nav
      aria-label="Diagnostic workflow progress"
      className={cn('w-full max-w-[960px] mx-auto mb-8 mt-2 overflow-x-auto', className)}
    >
      <ol className="flex min-w-[560px] items-start px-1">
        {STAGES.map((stage, idx) => {
          const isActive = stage.id === currentStage
          const isCompleted = idx < currentIdx || (stage.id === 'data' && datasetLoaded && currentStage !== 'data')
          const isNext = idx === currentIdx + 1 && canContinue
          const isLocked = !isActive && !isCompleted && !isNext
          const isLast = idx === STAGES.length - 1
          const clickable = (isCompleted || isNext) && stage.to

          const node = (
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                isActive && 'border-accent bg-accent text-accent-fg shadow-sm',
                isCompleted && 'border-accent/30 bg-accent-muted text-accent',
                isNext && 'border-line-strong bg-surface text-secondary group-hover:border-accent group-hover:text-accent',
                isLocked && 'border-line-subtle bg-surface text-disabled',
              )}
            >
              {isCompleted ? (
                <Check className="size-3.5 stroke-[2.5]" />
              ) : isLocked ? (
                <Lock className="size-3" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
          )

          const label = (
            <span
              className={cn(
                'mt-2 block text-center text-[11px] font-medium leading-tight',
                isActive && 'text-primary',
                isCompleted && 'text-secondary',
                isNext && 'text-secondary group-hover:text-primary',
                isLocked && 'text-disabled',
              )}
            >
              {stage.label}
            </span>
          )

          return (
            <li key={stage.id} className={cn('flex flex-1 flex-col items-center', !isLast && 'relative')}>
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute left-1/2 top-3.5 h-px w-full',
                    isCompleted ? 'bg-accent/30' : 'bg-line-subtle',
                  )}
                />
              )}
              {clickable ? (
                <Link
                  to={stage.to!}
                  className="focus-ring group relative z-10 flex flex-col items-center rounded outline-none"
                  title={isCompleted ? `Return to ${stage.label}` : `Proceed to ${stage.label}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {node}
                  {label}
                </Link>
              ) : (
                <div className="relative z-10 flex flex-col items-center" aria-current={isActive ? 'step' : undefined}>
                  {node}
                  {label}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
