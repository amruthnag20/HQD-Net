import { Check, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ReviewerStatus } from '../types/patientReport'

type StageStatus = 'complete' | 'current' | 'pending' | 'not-implemented'

type Stage = { label: string; status: StageStatus }

/**
 * Honest feedback-loop visualization. Only the first two stages reflect real
 * frontend state (a prediction exists; a clinician has reviewed it this
 * session). Outcome tracking, retraining, and model-registry updates are
 * roadmap items with no backend today — shown as such rather than implied to
 * be running.
 */
export function FeedbackPipeline({ reviewerStatus }: { reviewerStatus: ReviewerStatus }) {
  const stages: Stage[] = [
    { label: 'Prediction generated', status: 'complete' },
    {
      label: 'Clinician reviewed',
      status: reviewerStatus === 'reviewed' ? 'complete' : reviewerStatus === 'needs-revision' ? 'current' : 'pending',
    },
    { label: 'Outcome tracking', status: 'not-implemented' },
    { label: 'Model retraining', status: 'not-implemented' },
    { label: 'Registry update', status: 'not-implemented' },
  ]

  return (
    <div>
      <ol className="flex items-start">
        {stages.map((s, i) => {
          const isLast = i === stages.length - 1
          return (
            <li key={s.label} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      'absolute right-1/2 h-px w-full',
                      stages[i - 1].status === 'complete' ? 'bg-success/40' : 'bg-line-subtle',
                    )}
                  />
                )}
                <div className="relative z-10 mx-auto">
                  <StageDot status={s.status} />
                </div>
              </div>
              <span
                className={cn(
                  'mt-2 max-w-[6rem] text-center text-[11px] leading-tight',
                  s.status === 'not-implemented' ? 'text-disabled' : 'text-secondary',
                )}
              >
                {s.label}
              </span>
              {!isLast && null}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-xs text-muted">
        Outcome tracking, retraining, and registry updates are roadmap items — not implemented yet.
      </p>
    </div>
  )
}

function StageDot({ status }: { status: StageStatus }) {
  if (status === 'complete') {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-success text-white">
        <Check className="size-3.5" />
      </span>
    )
  }
  if (status === 'current') {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-warning-muted text-warning">
        <Clock className="size-3.5" />
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="flex size-6 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-muted">
        <Circle className="size-2.5 fill-current" />
      </span>
    )
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-line-subtle bg-surface text-disabled">
      <Circle className="size-2.5" />
    </span>
  )
}
