import type { ProcessedDataset } from '@/features/preprocessing/types/preprocessing'
import { assessQuantumIntegration } from './assessQuantumIntegration'
import { INTEGRATION_GAPS, QUANTUM_AUDIT_DATE, QUANTUM_CIRCUIT_METADATA, QUANTUM_INPUT_DIMENSION } from './quantumModelFacts'
import type { QuantumModelResult } from '../types/quantumMl'

/** Builds the quantum branch's result purely from ProcessedDataset +
 *  audited, static facts about the existing model — never from a raw
 *  dataset, never re-running preprocessing, never fabricating a
 *  prediction/vector/metric. Every nullable field here really is
 *  unavailable right now, not just omitted. */
export function buildQuantumResult(processed: ProcessedDataset): QuantumModelResult {
  const assessment = assessQuantumIntegration(processed)

  return {
    status: assessment.status,
    statusMessage: assessment.message,
    modelType: QUANTUM_CIRCUIT_METADATA.modelType,
    featureCount: processed.processedFeatureCount,
    featureNames: processed.processedColumnNames,
    quantumInputDimension: QUANTUM_INPUT_DIMENSION,
    quantumInputVector: null,
    targetColumn: processed.targetColumn,
    prediction: null,
    probabilities: null,
    metrics: null,
    modelMetadata: {
      auditedAt: QUANTUM_AUDIT_DATE,
      integrationGaps: INTEGRATION_GAPS,
    },
    quantumMetadata: QUANTUM_CIRCUIT_METADATA,
  }
}
