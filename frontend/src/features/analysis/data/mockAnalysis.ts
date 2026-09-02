import type { AnalysisResult, EvidenceItem } from '../types/analysis'

export const MOCK_EVIDENCE: EvidenceItem[] = [
  { feature: 'CD3E Expression', contribution: 0.42 },
  { feature: 'GZMB Levels', contribution: 0.28 },
  { feature: 'Tumor Mutational Burden', contribution: 0.16 },
  { feature: 'PD-L1 Status', contribution: 0.12 },
]

export const getMockResult = (engine: 'VQC' | 'QSVM'): AnalysisResult => ({
  riskClassification: 'HIGH RISK',
  confidence: 94.2,
  engine,
  qubits: 4,
  execution: 'LOCAL SIMULATOR',
  latency: '5.8s',
  classicalBaseline: 91.8,
  evidence: MOCK_EVIDENCE,
})

// Simulated delay in milliseconds
export const SIMULATION_DELAYS = {
  ingest: 800,
  configurationTransition: 400,
  confirmationTransition: 500,
  
  // Pipeline execution timing (total ~6 seconds)
  pipeline: {
    preprocess: 800,
    encode: 800,
    quantum: 2000,
    postprocess: 800,
    explain: 700,
    resultTransition: 600,
  }
}
