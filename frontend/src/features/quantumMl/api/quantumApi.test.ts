import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  checkQuantumBackend,
  runNativeVqcVerification,
  getQuantumApiBaseUrl,
  type NativeQuantumPredictResponse,
} from './quantumApi'

describe('quantumApi client (Phase 3B.3 Integration)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('1. API client builds correct health URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'hqd-net-quantum-backend' }),
    })
    global.fetch = mockFetch

    const baseUrl = getQuantumApiBaseUrl()
    expect(baseUrl).toBeDefined()

    const res = await checkQuantumBackend()
    expect(res.status).toBe('ok')
    expect(res.service).toBe('hqd-net-quantum-backend')
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/health`, expect.objectContaining({ method: 'GET' }))
  })

  it('2. API client builds correct prediction request for native dataset', async () => {
    const mockResponse: NativeQuantumPredictResponse = {
      status: 'complete',
      model: {
        name: 'DressedVQC',
        checkpoint: 'quantum_core/vqc_model_weights.pth',
        wires: 10,
        layers: 2,
        feature_map: 'AngleEmbedding(rotation=Y)',
        ansatz: 'StronglyEntanglingLayers',
      },
      input: {
        source: 'clinical_data_synthetic.csv',
        patient_id: 'PAT_1000',
        feature_count: 10,
        feature_names: ['biomarker_04', 'biomarker_01'],
        standardized_vector: [-0.228, -0.055],
      },
      prediction: {
        class_index: 0,
        class_label: 'Normal',
        probabilities: {
          Normal: 0.719482,
          'High Risk': 0.280518,
        },
      },
      quantum_telemetry: {
        device: 'default.qubit',
        wires: 10,
        precision: 'float64',
      },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })
    global.fetch = mockFetch

    const result = await runNativeVqcVerification(0, 'clinical_data_synthetic.csv')
    expect(mockFetch).toHaveBeenCalledWith(
      `${getQuantumApiBaseUrl()}/api/quantum/predict`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dataset: 'clinical_data_synthetic.csv', row_index: 0 }),
      })
    )
    expect(result.prediction.class_label).toBe('Normal')
  })

  it('3. successful prediction response is parsed faithfully without mutating values', async () => {
    const rawResult: NativeQuantumPredictResponse = {
      status: 'complete',
      model: {
        name: 'DressedVQC',
        checkpoint: 'quantum_core/vqc_model_weights.pth',
        wires: 10,
        layers: 2,
        feature_map: 'AngleEmbedding(rotation=Y)',
        ansatz: 'StronglyEntanglingLayers',
      },
      input: {
        source: 'clinical_data_synthetic.csv',
        patient_id: 'PAT_1001',
        feature_count: 10,
        feature_names: ['biomarker_04', 'biomarker_01'],
        standardized_vector: [1.23, -0.45],
      },
      prediction: {
        class_index: 1,
        class_label: 'High Risk',
        probabilities: {
          Normal: 0.35,
          'High Risk': 0.65,
        },
      },
      quantum_telemetry: {
        device: 'default.qubit',
        wires: 10,
        precision: 'float64',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => rawResult,
    })

    const parsed = await runNativeVqcVerification(1)
    expect(parsed.status).toBe('complete')
    expect(parsed.prediction.class_label).toBe('High Risk')
    expect(parsed.prediction.probabilities['High Risk']).toBe(0.65)
    expect(parsed.input.patient_id).toBe('PAT_1001')
  })

  it('4. backend unavailable is handled without crash', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    await expect(checkQuantumBackend()).rejects.toThrow('Failed to fetch')
    await expect(runNativeVqcVerification(0)).rejects.toThrow('Failed to fetch')
  })

  it('5. HTTP error is handled and propagates server error detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Row index 9999 out of bounds for native dataset." }),
    })

    await expect(runNativeVqcVerification(9999)).rejects.toThrow(
      'Quantum execution failed: Row index 9999 out of bounds for native dataset.'
    )
  })

  it('6. loading state is clean: async request begins and ends cleanly', async () => {
    let resolved = false
    global.fetch = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      resolved = true
      return {
        ok: true,
        json: async () => ({
          status: 'complete',
          model: { name: 'DressedVQC' },
          prediction: { class_label: 'Normal', probabilities: { Normal: 0.72, 'High Risk': 0.28 } },
        }),
      }
    })

    const promise = runNativeVqcVerification(0)
    expect(resolved).toBe(false)
    await promise
    expect(resolved).toBe(true)
  })

  it('7. successful result contains real quantum telemetry (PennyLane default.qubit, float64)', async () => {
    const mockTelemetry: NativeQuantumPredictResponse = {
      status: 'complete',
      model: {
        name: 'DressedVQC',
        checkpoint: 'quantum_core/vqc_model_weights.pth',
        wires: 10,
        layers: 2,
        feature_map: 'AngleEmbedding(rotation=Y)',
        ansatz: 'StronglyEntanglingLayers',
      },
      input: {
        source: 'clinical_data_synthetic.csv',
        patient_id: 'PAT_1000',
        feature_count: 10,
        feature_names: ['biomarker_04'],
        standardized_vector: [-0.228],
      },
      prediction: {
        class_index: 0,
        class_label: 'Normal',
        probabilities: { Normal: 0.7195, 'High Risk': 0.2805 },
      },
      quantum_telemetry: {
        device: 'default.qubit',
        wires: 10,
        precision: 'float64',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTelemetry,
    })

    const result = await runNativeVqcVerification(0)
    expect(result.quantum_telemetry.device).toBe('default.qubit')
    expect(result.quantum_telemetry.wires).toBe(10)
    expect(result.quantum_telemetry.precision).toBe('float64')
  })

  it('8. failed request does not produce or display fabricated probabilities', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Quantum execution error: simulation failed' }),
    })

    let caughtError: Error | null = null
    let resultPayload = null
    try {
      resultPayload = await runNativeVqcVerification(0)
    } catch (e) {
      caughtError = e as Error
    }

    expect(resultPayload).toBeNull()
    expect(caughtError).not.toBeNull()
    expect(caughtError?.message).toContain('Quantum execution error: simulation failed')
  })

  it('9. current 5-feature clinical data is NOT accepted as native VQC input', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Unsupported dataset 'sample_clinical_dataset.csv'." }),
    })

    await expect(runNativeVqcVerification(0, 'sample_clinical_dataset.csv')).rejects.toThrow(
      "Quantum execution failed: Unsupported dataset 'sample_clinical_dataset.csv'."
    )
  })

  it('10. native verification contract is explicitly typed to native synthetic domain', async () => {
    const defaultDataset = 'clinical_data_synthetic.csv'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'complete', input: { source: defaultDataset } }),
    })

    await runNativeVqcVerification(0)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/quantum/predict'),
      expect.objectContaining({
        body: expect.stringContaining(defaultDataset),
      })
    )
  })
})
