import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HQD-Net Caught Error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/app/home'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[500px] w-full flex-col items-center justify-center p-8 text-center">
          <div className="flex flex-col items-center max-w-md border border-line bg-surface-raised p-8 rounded-lg shadow-popover">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/20">
              <AlertTriangle className="size-6" strokeWidth={1.5} />
            </div>

            <span className="font-mono text-[10px] text-muted tracking-widest uppercase mb-1">
              SYSTEM DEGRADED / 01
            </span>
            <h2 className="font-display text-2xl text-primary tracking-wide uppercase mb-3">
              Workspace Interrupted
            </h2>
            <p className="font-sans text-sm text-secondary leading-relaxed mb-6">
              This computational workspace encountered an unexpected state. State telemetry has been recorded locally.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="focus-ring inline-flex items-center gap-2 border border-line px-4 py-2.5 font-mono text-xs text-secondary hover:text-primary hover:border-line-strong transition-colors uppercase tracking-wider"
              >
                <RotateCcw className="size-3.5" />
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="focus-ring inline-flex items-center gap-2 bg-accent text-accent-fg px-4 py-2.5 font-mono text-xs hover:bg-accent-hover transition-colors uppercase tracking-wider"
              >
                <Home className="size-3.5" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
