import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchProducts } from '../api/products';
import type { ProductWithBalance, Paged } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ProductFormModal } from './ProductFormModal';
import { MovementFormModal } from './MovementFormModal';
import { useQueryClient } from '@tanstack/react-query';
import { createMovement } from '../api/movements';
import { deleteProduct } from '../api/products';

export function ProductDashboard() {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [openCreate, setOpenCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'balance'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();
  const [openMove, setOpenMove] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const query = useQuery<Paged<ProductWithBalance>>({
    queryKey: ['products', debounced, page, pageSize, sortBy, sortDir],
    queryFn: () => fetchProducts(debounced, page, pageSize, sortBy, sortDir),
    staleTime: 15_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const currentPage = query.data?.page ?? page;
  const currentPageSize = query.data?.pageSize ?? pageSize;
  const totalPages = Math.max(Math.ceil(total / currentPageSize), 1);

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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // resetar para primeira página ao mudar busca
          }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          Total: <span className="font-medium">{total}</span>{' '}
          {total > 0 && (
            <span>
              (Página {currentPage} de {totalPages})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Ordenar por:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={sortBy}
            onChange={(e) => {
              const v = e.target.value as 'name' | 'sku' | 'balance';
              setSortBy(v);
              setPage(1);
            }}
          >
            <option value="name">Nome</option>
            <option value="sku">SKU</option>
            <option value="balance">Saldo</option>
          </select>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={sortDir}
            onChange={(e) => {
              const v = e.target.value as 'asc' | 'desc';
              setSortDir(v);
              setPage(1);
            }}
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={currentPage <= 1 || query.isFetching}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={currentPage >= totalPages || query.isFetching}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Próxima →
          </button>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={currentPageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              setPage(1);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}/página
              </option>
            ))}
          </select>

          {/* Ações em massa na página atual */}
          <span className="ml-2 h-5 w-px bg-gray-300" aria-hidden="true" />
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={items.length === 0 || query.isFetching}
            onClick={async () => {
              if (items.length === 0) return;
              const totalBalance = items.reduce((acc, it) => acc + (it.balance > 0 ? it.balance : 0), 0);
              if (totalBalance <= 0) {
                alert('Nenhum item com saldo > 0 nesta página.');
                return;
              }
              const ok = window.confirm(
                `Zerar todos os produtos desta página? Será lançada SAÍDA (OUT) total de ${totalBalance}.`
              );
              if (!ok) return;
              const ops = items
                .filter((it) => it.balance > 0)
                .map((it) => createMovement(it.id, { type: 'OUT', quantity: it.balance }));
              const results = await Promise.allSettled(ops);
              const failed = results.filter((r) => r.status === 'rejected');
              if (failed.length > 0) {
                alert(`Falha ao zerar ${failed.length} de ${results.length} produtos.`);
              }
              qc.invalidateQueries({ queryKey: ['products'] });
            }}
            title="Zerar todos os saldos da página"
          >
            Zerar página
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm hover:bg-red-50 text-red-700 border-red-300 disabled:opacity-50"
            disabled={items.length === 0 || query.isFetching}
            onClick={async () => {
              if (items.length === 0) return;
              const ok = window.confirm(
                `Excluir todos os produtos desta página? Esta ação remove os produtos e suas movimentações.`
              );
              if (!ok) return;
              const ops = items.map((it) => deleteProduct(it.id));
              const results = await Promise.allSettled(ops);
              const failed = results.filter((r) => r.status === 'rejected');
              if (failed.length > 0) {
                alert(`Falha ao excluir ${failed.length} de ${results.length} produtos.`);
              }
              // Voltar para página 1 se a página ficar vazia
              setPage(1);
              qc.invalidateQueries({ queryKey: ['products'] });
            }}
            title="Excluir todos os produtos da página"
          >
            Excluir página
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none"
                onClick={() => {
                  setPage(1);
                  if (sortBy === 'name') {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy('name');
                    setSortDir('asc');
                  }
                }}
                title="Ordenar por Nome"
              >
                Nome do Produto {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none"
                onClick={() => {
                  setPage(1);
                  if (sortBy === 'sku') {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy('sku');
                    setSortDir('asc');
                  }
                }}
                title="Ordenar por SKU"
              >
                SKU {sortBy === 'sku' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none"
                onClick={() => {
                  setPage(1);
                  if (sortBy === 'balance') {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy('balance');
                    setSortDir('asc');
                  }
                }}
                title="Ordenar por Saldo"
              >
                Saldo Atual {sortBy === 'balance' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {query.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                  Carregando...
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-red-700">
                  {(query.error as Error)?.message || 'Erro ao carregar produtos'}
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {items.map((p: ProductWithBalance) => {
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setOpenMove(true);
                        }}
                        title="Lançar entrada/saída"
                      >
                        Movimentar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                        disabled={p.balance <= 0}
                        onClick={async () => {
                          if (p.balance <= 0) return;
                          const ok = window.confirm(`Zerar saldo de ${p.name}? Será lançada uma SAÍDA (OUT) de ${p.balance}.`);
                          if (!ok) return;
                          try {
                            await createMovement(p.id, { type: 'OUT', quantity: p.balance });
                            qc.invalidateQueries({ queryKey: ['products'] });
                          } catch (e: any) {
                            alert(e?.message || 'Falha ao zerar saldo');
                          }
                        }}
                        title="Zerar saldo com uma saída"
                      >
                        Zerar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-sm hover:bg-red-50 text-red-700 border-red-300"
                        onClick={async () => {
                          const ok = window.confirm(`Excluir produto ${p.name}? Esta ação remove o produto e suas movimentações.`);
                          if (!ok) return;
                          try {
                            await deleteProduct(p.id);
                            qc.invalidateQueries({ queryKey: ['products'] });
                          } catch (e: any) {
                            alert(e?.message || 'Falha ao excluir produto');
                          }
                        }}
                        title="Excluir produto e suas movimentações"
                      >
                        Excluir
                      </button>
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
          // Recarregar mantendo filtros e paginação
          qc.invalidateQueries({ queryKey: ['products'] });
        }}
      />

      <MovementFormModal
        open={openMove}
        onOpenChange={(v) => {
          setOpenMove(v);
          if (!v) setSelectedProductId(null);
        }}
        productId={selectedProductId || ''}
        onSuccess={() => {
          // Atualiza saldos após movimentação
          qc.invalidateQueries({ queryKey: ['products'] });
        }}
      />
    </section>
  );
}

export default ProductDashboard;
