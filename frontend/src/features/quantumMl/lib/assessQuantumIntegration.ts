import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import type { QuantumModelStatus } from '../types/quantumMl'

export type QuantumIntegrationAssessment = {
  status: Extract<QuantumModelStatus, 'input-incompatible' | 'integration-pending'>
  message: string
}

/** Decides the quantum branch's status from the same ProcessedDataset
 *  Classical ML reads — no separate dataset, no re-preprocessing. Given
 *  the current repository audit findings, this can only ever resolve to
 *  'input-incompatible' (nothing to project) or 'integration-pending' (a
 *  real dataset exists, but no callable path to the quantum model exists
 *  yet) — never 'ready', since nothing here can actually execute it. */
export function assessQuantumIntegration(processed: ProcessedDataset): QuantumIntegrationAssessment {
  if (processed.processedFeatureCount === 0) {
    return {
      status: 'input-incompatible',
      message: 'No model-ready features are available from Phase 2 to project into a quantum input.',
    }
  }

  return {
    status: 'integration-pending',
    message: 'The existing quantum model (DressedVQC) is documented and its checkpoint is present, but no callable execution path connects this frontend to it yet — see the integration gaps below.',
  }
}
