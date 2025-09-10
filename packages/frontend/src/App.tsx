import { useState } from 'react';
import ProductDashboard from './components/ProductDashboard';
import SalesDashboard from './components/SalesDashboard';
import FinanceDashboard from './components/FinanceDashboard';

function App() {
  const [tab, setTab] = useState<'sales' | 'finance' | 'stock'>('stock');
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl p-4">
          <h1 className="text-2xl font-semibold">SimpleStock</h1>
          <p className="text-sm text-gray-500">Sistema de Vendas, Financeiro e Estoque</p>
          <nav className="mt-3 flex flex-wrap gap-2">
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                tab === 'sales' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-800'
              }`}
              onClick={() => setTab('sales')}
            >
              Vendas
            </button>
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                tab === 'finance' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-800'
              }`}
              onClick={() => setTab('finance')}
            >
              Financeiro
            </button>
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                tab === 'stock' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-800'
              }`}
              onClick={() => setTab('stock')}
            >
              Estoque
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-4">
        {tab === 'sales' && <SalesDashboard />}
        {tab === 'finance' && <FinanceDashboard />}
        {tab === 'stock' && <ProductDashboard />}
      </section>
    </main>
  );
}

export default App;
