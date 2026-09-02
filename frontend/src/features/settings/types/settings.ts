export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'PROFILE & WORKSPACE' },
  { id: 'analysis', label: 'ANALYSIS DEFAULTS' },
  { id: 'quantum', label: 'QUANTUM BACKEND' },
  { id: 'model', label: 'MODEL & PIPELINE' },
  { id: 'clinical', label: 'CLINICAL INTERPRETATION' },
  { id: 'governance', label: 'SAFETY & GOVERNANCE' },
  { id: 'research', label: 'ADVANCED / RESEARCH' },
  { id: 'system', label: 'SYSTEM INFORMATION' },
] as const

export type SectionId = (typeof SETTINGS_SECTIONS)[number]['id']

export interface ProfileSettings {
  name: string
  email: string
  role: string
  organization: string
}

export interface AnalysisSettings {
  defaultEngine: 'VQC' | 'QSVM'
  defaultBackend: string
  defaultEncoding: string
  defaultQubits: number
  confirmBeforeExecution: boolean
}

export interface ClinicalSettings {
  interpretationDetail: 'CONCISE' | 'STANDARD' | 'DETAILED'
  showKeyEvidence: boolean
  showAttribution: boolean
  clinicalLanguage: 'TECHNICAL' | 'RESEARCH' | 'CLINICAL'
  displayResearchDisclaimer: boolean
}

export interface GovernanceSettings {
  researchMode: boolean
  showUncertainty: boolean
  labelSimulatedOutput: boolean
}

export interface ResearchSettings {
  showAdvancedInfo: boolean
  showExecutionTelemetry: boolean
  quantumVisualDetail: 'MINIMAL' | 'STANDARD' | 'DETAILED'
}

export interface Settings {
  profile: ProfileSettings
  analysis: AnalysisSettings
  clinical: ClinicalSettings
  governance: GovernanceSettings
  research: ResearchSettings
}
