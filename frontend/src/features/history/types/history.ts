export type EngineType = 'VQC' | 'QSVM'
export type Classification = 'HIGH RISK' | 'MEDIUM RISK' | 'LOW RISK'
export type AnalysisStatus = 'COMPLETE' | 'FAILED'

export interface AnalysisRecord {
  id: string
  date: string // ISO string
  engine: EngineType
  status: AnalysisStatus
  classification: Classification | null
  riskScore: number // 0 to 1
  confidence: number // 0 to 100
  execution: ExecutionRecord
  benchmark: BenchmarkRecord
  evidence: AttributionRecord[]
  qubitAttribution: AttributionRecord[]
  translation: ClinicalTranslation
  failReason?: string
}

export interface ExecutionRecord {
  backend: string
  qubits: number
  encoding: string
  durationMs: number
  stages: {
    preprocess: boolean
    encode: boolean
    quantum: boolean
    postprocess: boolean
    explainability: boolean
  }
}

export interface BenchmarkRecord {
  hqdNetConfidence: number
  classicalBaseline: number
}

export interface AttributionRecord {
  feature: string // e.g., "BIOMARKER A" or "Q0"
  contribution: number // -1 to 1 typically
}

export interface ClinicalTranslation {
  output: string
  interpretation: string
}
