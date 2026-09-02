import { Dialog } from './Dialog'
import { Button } from './Button'

export type ConfirmDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} description={description} maxWidth="max-w-sm">
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="focus-ring px-4 py-2 border border-line font-mono text-xs text-secondary hover:text-primary hover:border-line-strong transition-colors uppercase tracking-wider disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <Button
          variant={tone === 'danger' ? 'accent' : 'primary'}
          size="sm"
          loading={loading}
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={tone === 'danger' ? 'bg-danger text-canvas hover:bg-danger/90 font-mono text-xs tracking-wider uppercase' : 'font-mono text-xs tracking-wider uppercase'}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
