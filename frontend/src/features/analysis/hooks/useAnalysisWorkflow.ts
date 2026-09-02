import { useState, useCallback, useRef } from 'react'
import type { 
  WorkflowState, 
  EngineType, 
  AnalysisInput, 
  AnalysisConfiguration, 
  AnalysisResult 
} from '../types/analysis'
import { getMockResult, SIMULATION_DELAYS } from '../data/mockAnalysis'

export function useAnalysisWorkflow() {
  const [state, setState] = useState<WorkflowState>('idle')
  const [input, setInput] = useState<AnalysisInput | null>(null)
  const [configuration, setConfiguration] = useState<AnalysisConfiguration>({
    engine: null,
    qubits: 4,
    execution: 'LOCAL SIMULATOR',
    encoding: 'ANGLE EMBEDDING',
  })
  const [result, setResult] = useState<AnalysisResult | null>(null)
  
  // Keep track of timeouts for cleanup
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
  }, [])

  // 1. Input Stage
  const handleUpload = useCallback((file: File) => {
    if (state !== 'idle') return
    
    // We only accept valid formats based on the requirement
    const isValidFormat = file.name.endsWith('.csv') || file.name.endsWith('.dcm')
    
    setState('ingesting')
    
    addTimeout(() => {
      if (isValidFormat) {
        setInput({
          filename: file.name,
          sizeBytes: file.size,
          featuresDetected: 6,
          status: 'valid'
        })
        setState('validated')
      } else {
        setInput({
          filename: file.name,
          sizeBytes: file.size,
          featuresDetected: 0,
          status: 'invalid'
        })
        // Allow retry
        setState('idle')
      }
    }, SIMULATION_DELAYS.ingest)
  }, [state, addTimeout])

  // 2. Configure Stage
  const handleContinueToConfiguration = useCallback(() => {
    if (state !== 'validated') return
    setState('configuring')
  }, [state])

  const handleSelectEngine = useCallback((engine: EngineType) => {
    setConfiguration(prev => ({ ...prev, engine }))
  }, [])

  // 3. Confirm Stage
  const handleConfirmEngine = useCallback(() => {
    if (state !== 'configuring' || !configuration.engine) return
    setState('confirmed')
  }, [state, configuration.engine])

  // 4. Execution Pipeline (Simulated)
  const handleStartAnalysis = useCallback(() => {
    if (state !== 'confirmed' || !configuration.engine) return
    
    // Start sequence
    setState('preprocessing')
    
    let cumulativeDelay = 0
    
    // -> Encode
    cumulativeDelay += SIMULATION_DELAYS.pipeline.preprocess
    addTimeout(() => setState('encoding'), cumulativeDelay)
    
    // -> Quantum
    cumulativeDelay += SIMULATION_DELAYS.pipeline.encode
    addTimeout(() => setState('quantum'), cumulativeDelay)
    
    // -> Postprocess
    cumulativeDelay += SIMULATION_DELAYS.pipeline.quantum
    addTimeout(() => setState('postprocessing'), cumulativeDelay)
    
    // -> Explainability
    cumulativeDelay += SIMULATION_DELAYS.pipeline.postprocess
    addTimeout(() => setState('explainability'), cumulativeDelay)
    
    // -> Complete
    cumulativeDelay += SIMULATION_DELAYS.pipeline.explain
    addTimeout(() => setState('complete'), cumulativeDelay)
    
    // -> Result visible (wait for complete animation)
    cumulativeDelay += SIMULATION_DELAYS.pipeline.resultTransition
    addTimeout(() => {
      setResult(getMockResult(configuration.engine as 'VQC' | 'QSVM'))
    }, cumulativeDelay)
    
  }, [state, configuration.engine, addTimeout])

  const handleReset = useCallback(() => {
    clearAllTimeouts()
    setState('idle')
    setInput(null)
    setConfiguration(prev => ({ ...prev, engine: null }))
    setResult(null)
  }, [clearAllTimeouts])

  // Mock error for testing
  const triggerMockError = useCallback(() => {
    clearAllTimeouts()
    setState('error')
  }, [clearAllTimeouts])

  return {
    state,
    input,
    configuration,
    result,
    actions: {
      handleUpload,
      handleContinueToConfiguration,
      handleSelectEngine,
      handleConfirmEngine,
      handleStartAnalysis,
      handleReset,
      triggerMockError
    }
  }
}
