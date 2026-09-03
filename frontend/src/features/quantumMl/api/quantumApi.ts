/**
 * Quantum Backend API Client (Phase 3B.3).
 * Connects the React UI to the standalone FastAPI quantum service.
 */

export type BackendHealthResponse = {
  status: string
  service: string
}

export type NativeQuantumPredictRequest = {
  dataset: string
  row_index: number
}

export type NativeModelTelemetry = {
  name: string
  checkpoint: string
  wires: number
  layers: number
  feature_map: string
  ansatz: string
}

export type NativeInputTelemetry = {
  source: string
  patient_id: string
  feature_count: number
  feature_names: string[]
  standardized_vector: number[]
}

export type NativePredictionTelemetry = {
  class_index: number
  class_label: string
  probabilities: {
    Normal: number
    'High Risk': number
  }
}

export type NativeQuantumExecutionTelemetry = {
  device: string
  wires: number
  precision: string
}

export type NativeQuantumPredictResponse = {
  status: string
  model: NativeModelTelemetry
  input: NativeInputTelemetry
  prediction: NativePredictionTelemetry
  quantum_telemetry: NativeQuantumExecutionTelemetry
}

export function getQuantumApiBaseUrl(): string {
  // Read VITE_QUANTUM_API_URL or fall back to default development backend
  return import.meta.env.VITE_QUANTUM_API_URL || 'http://localhost:8000'
}

/**
 * Checks connectivity to the standalone quantum FastAPI backend.
 */
export async function checkQuantumBackend(): Promise<BackendHealthResponse> {
  const baseUrl = getQuantumApiBaseUrl()
  const res = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Quantum backend health check failed with HTTP ${res.status}`)
  }

  return (await res.json()) as BackendHealthResponse
}

/**
 * Sends a native-domain prediction request to the standalone quantum backend.
 */
export async function runNativeVqcVerification(
  rowIndex: number = 0,
  dataset: string = 'clinical_data_synthetic.csv'
): Promise<NativeQuantumPredictResponse> {
  const baseUrl = getQuantumApiBaseUrl()
  const payload: NativeQuantumPredictRequest = {
    dataset,
    row_index: rowIndex,
  }

  const res = await fetch(`${baseUrl}/api/quantum/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail
      }
    } catch {
      // ignore json parse error on non-json error responses
    }
    throw new Error(`Quantum execution failed: ${errorDetail}`)
  }

  return (await res.json()) as NativeQuantumPredictResponse
}
