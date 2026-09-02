export type WorkflowState = 
  | 'idle' 
  | 'ingesting' 
  | 'validated' 
  | 'configuring' 
  | 'confirmed' 
  | 'preprocessing' 
  | 'encoding' 
  | 'quantum' 
  | 'postprocessing' 
  | 'explainability' 
  | 'complete' 
  | 'error'

export type EngineType = 'VQC' | 'QSVM' | null

export type AnalysisInput = {
  filename: string
  sizeBytes: number
  featuresDetected: number
  status: 'valid' | 'invalid'
}

export type AnalysisConfiguration = {
  engine: EngineType
  qubits: number
  execution: 'LOCAL SIMULATOR'
  encoding: 'ANGLE EMBEDDING'
}

export type EvidenceItem = {
  feature: string
  contribution: number
}

export type AnalysisResult = {
  riskClassification: 'HIGH RISK' | 'LOW RISK' | 'MODERATE RISK'
  confidence: number
  engine: EngineType
  qubits: number
  execution: string
  latency: string
  classicalBaseline: number
  evidence: EvidenceItem[]
}
