import ProductDashboard from './components/ProductDashboard';

function App() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl p-4">
          <h1 className="text-2xl font-semibold">SimpleStock</h1>
          <p className="text-sm text-gray-500">Sistema de controle de estoque simplificado</p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-4">
        <ProductDashboard />
      </section>
    </main>
  );
}

export default App;
