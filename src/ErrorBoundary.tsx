import { Component, type ReactNode } from 'react'
import { clearSavedProject } from './project'

interface State {
  error?: Error
}

/** Shows what went wrong instead of a blank page, with a way out. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <h2>SynopGig a rencontré une erreur</h2>
        <p>Le projet enregistré dans ce navigateur est peut-être illisible.</p>
        <pre>{this.state.error.message}</pre>
        <button
          onClick={() => {
            clearSavedProject()
            location.reload()
          }}
        >
          Réinitialiser et recharger
        </button>
      </div>
    )
  }
}
