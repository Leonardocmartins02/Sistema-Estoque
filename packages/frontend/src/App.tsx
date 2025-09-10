import ProductDashboard from './components/ProductDashboard';
import { ToastProvider } from './components/ui/ToastProvider';
import { UserCircle2 } from 'lucide-react';

function App() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
          <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SimpleStock</h1>
              <p className="text-sm text-gray-500">Sistema de controle de estoque simplificado</p>
            </div>
            <button
              aria-label="Abrir menu do usuário"
              className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <UserCircle2 className="h-7 w-7" />
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-5xl p-4">
          <ProductDashboard />
        </section>
      </main>
    </ToastProvider>
  );
}

export default App;
