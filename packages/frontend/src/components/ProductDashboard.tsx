import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchProducts } from '../api/products';
import type { ProductWithBalance } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ProductFormModal } from './ProductFormModal';
import { useQueryClient } from '@tanstack/react-query';

export function ProductDashboard() {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [openCreate, setOpenCreate] = useState(false);
  const qc = useQueryClient();

  const query = useQuery<ProductWithBalance[]>({
    queryKey: ['products', debounced],
    queryFn: () => fetchProducts(debounced),
    staleTime: 15_000,
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  return (
    <section aria-labelledby="products-heading" className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="products-heading" className="text-lg font-medium">
            Produtos
          </h2>
          <p className="text-sm text-gray-500">Listagem com busca por Nome/SKU</p>
        </div>
        <div>
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
            onClick={() => setOpenCreate(true)}
          >
            + Novo Produto
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700">
          Buscar por Nome ou SKU
        </label>
        <input
          id="search"
          name="search"
          type="search"
          placeholder="Ex.: Caneta ou SKU123"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand sm:max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Nome do Produto
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SKU
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Saldo Atual
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {query.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-500">
                  Carregando...
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-red-700">
                  {(query.error as Error)?.message || 'Erro ao carregar produtos'}
                </td>
              </tr>
            )}
            {!query.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {items.map((p) => {
              const lowStock = p.balance < p.minStock;
              return (
                <tr key={p.id} className="hover:bg-gray-50 focus-within:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.sku}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.balance}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`inline-block h-2.5 w-2.5 rounded-full ${lowStock ? 'bg-red-500' : 'bg-green-500'}`}
                      />
                      <span className="text-xs text-gray-700">
                        {lowStock ? 'Abaixo do mínimo' : 'OK'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        open={openCreate}
        onOpenChange={setOpenCreate}
        mode="create"
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['products'] });
        }}
      />
    </section>
  );
}

export default ProductDashboard;
