import { Link } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type DiagnosticStageId = 'data' | 'preprocessing' | 'quantum' | 'predict' | 'explain' | 'benchmark'

export type DiagnosticWorkflowNavProps = {
  currentStage: DiagnosticStageId
  datasetLoaded?: boolean
  canContinue?: boolean
  className?: string
}

type StageDef = {
  id: DiagnosticStageId
  num: string
  label: string
  to?: string
}

const STAGES: StageDef[] = [
  { id: 'data', num: '01', label: 'DATA', to: '/app/data' },
  { id: 'preprocessing', num: '02', label: 'PREPROCESS', to: '/app/preprocessing' },
  { id: 'quantum', num: '03', label: 'QUANTUM' },
  { id: 'predict', num: '04', label: 'PREDICT' },
  { id: 'explain', num: '05', label: 'EXPLAIN' },
  { id: 'benchmark', num: '06', label: 'BENCHMARK' },
]

export function DiagnosticWorkflowNav({
  currentStage,
  datasetLoaded = false,
  canContinue = false,
  className,
}: DiagnosticWorkflowNavProps) {
  const currentIdx = STAGES.findIndex((s) => s.id === currentStage)

  return (
    <nav
      aria-label="Diagnostic Workflow Progress"
      className={cn('w-full max-w-[860px] mx-auto my-4', className)}
    >
      <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isActive = stage.id === currentStage
          const isCompleted = idx < currentIdx || (stage.id === 'data' && datasetLoaded && currentStage !== 'data')
          const isNext = idx === currentIdx + 1 && (stage.id === 'preprocessing' ? canContinue : false)
          const isLocked = !isActive && !isCompleted && !isNext

          const content = (
            <div
              className={cn(
                'group flex flex-col items-center justify-center rounded border p-2 text-center transition-all duration-150 relative min-h-[58px]',
                isActive && 'border-accent bg-accent/10 text-accent font-medium shadow-xs',
                isCompleted && 'border-line-strong bg-surface text-primary hover:border-accent hover:bg-surface-raised cursor-pointer',
                isNext && 'border-dashed border-accent/40 bg-surface/60 text-secondary hover:border-accent hover:text-primary cursor-pointer',
                isLocked && 'border-line/40 bg-surface/30 text-muted/60 cursor-not-allowed select-none',
              )}
            >
              <div className="flex items-center gap-1 font-mono text-[10px] tracking-wider mb-0.5">
                {isCompleted ? (
                  <Check className="size-3 text-success stroke-[2.5]" />
                ) : isLocked ? (
                  <Lock className="size-2.5 opacity-60" />
                ) : (
                  <span>{stage.num}</span>
                )}
                <span className={cn('text-[9px] uppercase tracking-widest', isActive && 'text-accent font-semibold')}>
                  {stage.label}
                </span>
              </div>

              <div className="font-mono text-[9px] uppercase tracking-tight">
                {isActive ? (
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                    ACTIVE
                  </span>
                ) : isCompleted ? (
                  <span className="text-success text-[8.5px]">COMPLETED</span>
                ) : isNext ? (
                  <span className="text-secondary text-[8.5px]">READY</span>
                ) : (
                  <span className="text-muted/60 text-[8.5px]">LOCKED</span>
                )}
              </div>
            </div>
          )

          if (isCompleted && stage.to) {
            return (
              <li key={stage.id} className="min-w-0">
                <Link to={stage.to} className="focus-ring block rounded outline-none" title={`Return to ${stage.label}`}>
                  {content}
                </Link>
              </li>
            )
          }

          if (isNext && stage.to && canContinue) {
            return (
              <li key={stage.id} className="min-w-0">
                <Link to={stage.to} className="focus-ring block rounded outline-none" title={`Proceed to ${stage.label}`}>
                  {content}
                </Link>
              </li>
            )
          }

          return (
            <li key={stage.id} className="min-w-0">
              {content}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
