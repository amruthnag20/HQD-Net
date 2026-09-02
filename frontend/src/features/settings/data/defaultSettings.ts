import type { Settings } from '../types/settings'

export const defaultSettings: Settings = {
  profile: {
    name: 'Research User',
    email: 'researcher@example.org',
    role: 'Researcher',
    organization: 'HQD Research Lab'
  },
  analysis: {
    defaultEngine: 'VQC',
    defaultBackend: 'LOCAL SIMULATOR',
    defaultEncoding: 'ANGLE EMBEDDING',
    defaultQubits: 4,
    confirmBeforeExecution: true
  },
  clinical: {
    interpretationDetail: 'STANDARD',
    showKeyEvidence: true,
    showAttribution: true,
    clinicalLanguage: 'RESEARCH',
    displayResearchDisclaimer: true
  },
  governance: {
    researchMode: true,
    showUncertainty: true,
    labelSimulatedOutput: true
  },
  research: {
    showAdvancedInfo: false,
    showExecutionTelemetry: false,
    quantumVisualDetail: 'STANDARD'
  }
}

export const systemInformation = {
  application: 'HQD-NET',
  version: '0.1.0',
  environment: 'RESEARCH',
  frontend: 'REACT',
  runtime: 'VITE',
  quantumLayer: 'PENNYLANE / MOCK',
  status: 'READY',
  build: 'LOCAL DEVELOPMENT',
  ui: 'PHASE 6'
}

export const backendInformation = {
  type: 'LOCAL SIMULATOR',
  device: 'DEFAULT',
  qubits: 4,
  executionMode: 'SIMULATION',
  status: 'READY'
}
