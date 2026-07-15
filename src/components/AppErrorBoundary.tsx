import React from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Sártal interface recovery', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <main className="app-recovery-screen">
      <section>
        <span><ShieldCheck size={22} /> REPRISE SÉCURISÉE</span>
        <img src="./brand-mark.svg" alt="Sártal" />
        <h1>Votre poste reste ouvert</h1>
        <p>L’affichage de cette action a été interrompu. Vos données enregistrées restent conservées et vous pouvez reprendre sans revenir à l’accueil.</p>
        <div><button type="button" onClick={() => this.setState({ hasError: false })}><RefreshCw size={17} /> Réessayer ici</button><button type="button" onClick={() => window.location.reload()}><RefreshCw size={17} /> Recharger ce poste</button></div>
      </section>
    </main>;
  }
}

export default AppErrorBoundary;
