import type { AnalysisRecord } from '../types/history'

function createMockData(): AnalysisRecord[] {
  const data: AnalysisRecord[] = []
  
  const baseDate = new Date('2026-08-25T14:32:00Z')
  
  const engines = ['VQC', 'QSVM'] as const
  
  for (let i = 0; i < 18; i++) {
    const isFailed = i === 4 || i === 12
    const engine = engines[i % 2]
    
    // Deterministic pseudo-random values based on index
    const pseudoRandom = (i * 13) % 100 / 100 
    const riskScore = isFailed ? 0 : 0.1 + (pseudoRandom * 0.8) // 0.1 to 0.9
    
    let classification: 'HIGH RISK' | 'MEDIUM RISK' | 'LOW RISK' | null = null
    if (!isFailed) {
      if (riskScore > 0.7) classification = 'HIGH RISK'
      else if (riskScore > 0.4) classification = 'MEDIUM RISK'
      else classification = 'LOW RISK'
    }
    
    const confidence = isFailed ? 0 : 70 + (pseudoRandom * 28) // 70 to 98
    
    const date = new Date(baseDate.getTime() - (i * 1000 * 60 * 60 * 37)) // Spread out over days
    
    data.push({
      id: `HQD-${String(24 - i).padStart(3, '0')}`,
      date: date.toISOString(),
      engine,
      status: isFailed ? 'FAILED' : 'COMPLETE',
      classification,
      riskScore,
      confidence,
      execution: {
        backend: 'LOCAL SIMULATOR',
        qubits: engine === 'VQC' ? 4 : 8,
        encoding: 'ANGLE EMBEDDING',
        durationMs: isFailed ? 1200 : 4500 + (pseudoRandom * 2000),
        stages: {
          preprocess: true,
          encode: true,
          quantum: !isFailed,
          postprocess: !isFailed,
          explainability: !isFailed
        }
      },
      benchmark: {
        hqdNetConfidence: confidence,
        classicalBaseline: confidence - 2.4 - (pseudoRandom * 3)
      },
      evidence: isFailed ? [] : [
        { feature: 'BIOMARKER A', contribution: 0.3 + (pseudoRandom * 0.2) },
        { feature: 'BIOMARKER B', contribution: 0.2 + (pseudoRandom * 0.1) },
        { feature: 'BIOMARKER C', contribution: 0.1 + (pseudoRandom * 0.15) }
      ].sort((a, b) => b.contribution - a.contribution),
      qubitAttribution: isFailed ? [] : Array.from({ length: engine === 'VQC' ? 4 : 8 }).map((_, qIdx) => ({
        feature: `Q${qIdx}`,
        contribution: 0.05 + (((qIdx * 7) % 10) / 100) * 2
      })).sort((a, b) => b.contribution - a.contribution),
      translation: {
        output: classification || 'FAILED',
        interpretation: isFailed 
          ? 'Analysis was interrupted due to quantum backend unavailability.'
          : `The simulated analysis indicates ${classification?.toLowerCase()} associated with the selected feature representation and attribution evidence.`
      },
      failReason: isFailed ? 'Quantum backend unavailable' : undefined
    })
  }
  
  return data
}

export const mockHistoryData = createMockData()
