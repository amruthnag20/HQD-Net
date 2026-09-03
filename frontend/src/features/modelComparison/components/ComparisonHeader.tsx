import { ShieldCheck, Database, User, Server } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { ModelComparisonResult } from '../types/modelComparison'

export type ComparisonHeaderProps = {
  result: ModelComparisonResult
  isBackendOnline: boolean
}

export function ComparisonHeader({ result, isBackendOnline }: ComparisonHeaderProps) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary">Model comparison</h1>
          <p className="mt-1.5 max-w-xl text-sm text-secondary">
            Compare model predictions, confidence, and computational evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {result.isDemoFixture ? (
            <Badge tone="warning">{result.fixtureName || 'Demo scenario'}</Badge>
          ) : (
            <Badge tone="success">Live system state</Badge>
          )}

          <Badge tone={isBackendOnline ? 'neutral' : 'danger'}>
            <span className="flex items-center gap-1.5">
              <Server className="size-3" />
              {isBackendOnline ? 'VQC engine online' : 'VQC engine offline'}
            </span>
          </Badge>
        </div>
      </div>

      {/* Context metadata ribbon */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-surface-subtle p-3.5 text-sm">
        <div className="flex items-center gap-1.5 text-secondary">
          <User className="size-3.5 text-accent" />
          <span className="text-xs text-muted">Patient:</span>
          <span className="font-medium text-primary">{result.patientId}</span>
        </div>

        <div className="flex items-center gap-1.5 text-secondary">
          <Database className="size-3.5 text-accent" />
          <span className="text-xs text-muted">Dataset:</span>
          <span className="truncate max-w-[200px] font-medium text-primary">{result.datasetSource}</span>
        </div>

        <div className="flex items-center gap-1.5 text-secondary">
          <ShieldCheck className="size-3.5 text-accent" />
          <span className="text-xs text-muted">Target:</span>
          <span className="font-medium text-primary">{result.targetColumn ?? 'diagnosis'}</span>
        </div>
      </div>
    </div>
  )
}
