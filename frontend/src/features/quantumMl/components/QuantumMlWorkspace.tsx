import { QuantumModelPanel } from './QuantumModelPanel'
import { NativeVqcVerificationPanel } from './NativeVqcVerificationPanel'

export function QuantumMlWorkspace() {
  return (
    <div className="flex flex-col gap-6">
      <QuantumModelPanel />
      <NativeVqcVerificationPanel />
    </div>
  )
}

