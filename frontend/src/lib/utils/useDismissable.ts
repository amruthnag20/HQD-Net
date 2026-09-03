import { useEffect, type RefObject } from 'react'

/**
 * Closes an open overlay (popover/drawer) on outside pointer-down or Escape.
 * `containerRef` should wrap everything considered "inside" the overlay —
 * for a popover that's typically both the trigger button and the panel, so
 * clicking the trigger toggles rather than fighting the outside-click close.
 */
export function useDismissable(
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onDismiss()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [containerRef, onDismiss, active])
}
