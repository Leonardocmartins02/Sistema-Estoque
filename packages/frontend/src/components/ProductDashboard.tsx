import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchProducts } from '../api/products';
import type { ProductWithBalance, Paged } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ProductFormModal } from './ProductFormModal';
import { MovementFormModal } from './MovementFormModal';
import { MovementHistoryModal } from './MovementHistoryModal';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './ui/ToastProvider';
import { createMovement } from '../api/movements';
import { deleteProduct } from '../api/products';
import { ChevronDown, MoreHorizontal, Search } from 'lucide-react';

export function ProductDashboard() {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'balance'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();
  const [openMove, setOpenMove] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const { show: showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'ATTN' | 'OUT'>('ALL');
  const [editInitial, setEditInitial] = useState<Partial<ProductWithBalance> | null>(null);

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

  // Aplica filtro de status no client-side sobre a página corrente
  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((p) => {
      const isOut = p.balance === 0;
      const isAttn = p.balance > 0 && p.balance < p.minStock;
      const isOk = p.balance >= p.minStock;
      if (statusFilter === 'OUT') return isOut;
      if (statusFilter === 'ATTN') return isAttn;
      if (statusFilter === 'OK') return isOk;
      return true;
    });
  }, [items, statusFilter]);

  return (
    <section aria-labelledby="products-heading" className="mt-6">
      {/* Barra de ações principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="products-heading" className="text-xl font-semibold tracking-tight text-gray-900">
            Produtos
          </h2>
          <p className="text-sm text-gray-500">Gerencie o cadastro e o estoque</p>
        </div>
        <div>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
            onClick={() => setOpenCreate(true)}
          >
            + Adicionar Produto
          </button>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Buscar por Nome ou SKU
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Ex.: Caneta ou SKU123"
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Botão de Filtros com dropdown */}
        <div className="relative">
          <details className="group">
            <summary className="list-none">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Filtros <ChevronDown className="h-4 w-4" />
              </button>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border bg-white p-3 text-sm shadow-lg">
              <div className="mb-2 font-medium text-gray-700">Ordenação</div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <select
                  className="rounded-md border px-2 py-1"
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
                  className="rounded-md border px-2 py-1"
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
              </div>

              <div className="mb-2 font-medium text-gray-700">Status</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ['ALL', 'Todos'],
                  ['OK', 'OK'],
                  ['ATTN', 'Atenção'],
                  ['OUT', 'Em falta'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStatusFilter(val)}
                    className={`rounded-full px-3 py-1 text-xs border ${
                      statusFilter === val ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Barra de paginação e ações em massa */}
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
                showToast({ type: 'info', message: 'Nenhum item com saldo > 0 nesta página.' });
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
                showToast({ type: 'error', message: `Falha ao zerar ${failed.length} de ${results.length} produtos.` });
              }
              qc.invalidateQueries({ queryKey: ['products'] });
              showToast({ type: 'success', message: 'Saldos da página zerados.' });
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
                showToast({ type: 'error', message: `Falha ao excluir ${failed.length} de ${results.length} produtos.` });
              }
              // Voltar para página 1 se a página ficar vazia
              setPage(1);
              qc.invalidateQueries({ queryKey: ['products'] });
              showToast({ type: 'success', message: 'Produtos da página excluídos.' });
            }}
            title="Excluir todos os produtos da página"
          >
            Excluir página
          </button>
        </div>
      </div>

      {/* Tabela (desktop grande) */}
      <div className="mt-4 overflow-x-auto hidden lg:block">
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
            {!query.isLoading && !query.isError && filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {filteredItems.map((p: ProductWithBalance) => {
              const isOut = p.balance === 0;
              const isAttn = p.balance > 0 && p.balance < p.minStock;
              const isOk = p.balance >= p.minStock;
              return (
                <tr key={p.id} className="hover:bg-gray-50 focus-within:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.sku}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.balance}</td>
                  <td className="px-4 py-3">
                    {isOk && (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">OK</span>
                    )}
                    {isAttn && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Atenção</span>
                    )}
                    {isOut && (
                      <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Em Falta</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
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

                      <div className="relative">
                        <details className="relative inline-block">
                          <summary
                            aria-label="Mais ações"
                            className="inline-flex cursor-pointer items-center rounded-md border bg-white p-1.5 text-gray-600 hover:bg-gray-50 select-none list-none"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </summary>
                          <div className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 text-sm shadow-lg">
                            <button
                              type="button"
                              className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50"
                              onClick={() => {
                                setEditInitial(p);
                                setOpenEdit(true);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50"
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setOpenHistory(true);
                              }}
                            >
                              Ver Histórico
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                              disabled={p.balance <= 0}
                              onClick={async () => {
                                if (p.balance <= 0) return;
                                const ok = window.confirm(`Zerar saldo de ${p.name}? Será lançada uma SAÍDA (OUT) de ${p.balance}.`);
                                if (!ok) return;
                                try {
                                  await createMovement(p.id, { type: 'OUT', quantity: p.balance });
                                  qc.invalidateQueries({ queryKey: ['products'] });
                                  showToast({ type: 'success', message: `Saldo de ${p.name} zerado com sucesso.` });
                                } catch (e: any) {
                                  showToast({ type: 'error', message: e?.message || 'Falha ao zerar saldo' });
                                }
                              }}
                            >
                              Zerar Estoque
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded px-2 py-2 text-left text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                const ok = window.confirm(`Excluir produto ${p.name}? Esta ação não pode ser desfeita.`);
                                if (!ok) return;
                                try {
                                  await deleteProduct(p.id);
                                  qc.invalidateQueries({ queryKey: ['products'] });
                                  showToast({ type: 'success', message: `Produto ${p.name} excluído.` });
                                } catch (e: any) {
                                  showToast({ type: 'error', message: e?.message || 'Falha ao excluir produto' });
                                }
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile e tablets) */}
      <div className="mt-4 space-y-3 lg:hidden">
        {query.isLoading && (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">Carregando...</div>
        )}
        {query.isError && (
          <div className="rounded-lg border bg-white p-4 text-sm text-red-700">{(query.error as Error)?.message || 'Erro ao carregar produtos'}</div>
        )}
        {!query.isLoading && !query.isError && filteredItems.length === 0 && (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">Nenhum produto encontrado.</div>
        )}
        {filteredItems.map((p: ProductWithBalance) => {
          const isOut = p.balance === 0;
          const isAttn = p.balance > 0 && p.balance < p.minStock;
          const isOk = p.balance >= p.minStock;
          return (
            <div key={p.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">Saldo: {p.balance}</div>
                  <div className="mt-1">
                    {isOk && (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">OK</span>
                    )}
                    {isAttn && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Atenção</span>
                    )}
                    {isOut && (
                      <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Em Falta</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
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
                <details className="relative">
                  <summary
                    aria-label="Mais ações"
                    className="inline-flex cursor-pointer items-center rounded-md border bg-white p-1.5 text-gray-600 hover:bg-gray-50 select-none list-none"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 text-sm shadow-lg">
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50"
                      onClick={() => {
                        setEditInitial(p);
                        setOpenEdit(true);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setOpenHistory(true);
                      }}
                    >
                      Ver Histórico
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                      disabled={p.balance <= 0}
                      onClick={async () => {
                        if (p.balance <= 0) return;
                        const ok = window.confirm(`Zerar saldo de ${p.name}? Será lançada uma SAÍDA (OUT) de ${p.balance}.`);
                        if (!ok) return;
                        try {
                          await createMovement(p.id, { type: 'OUT', quantity: p.balance });
                          qc.invalidateQueries({ queryKey: ['products'] });
                          showToast({ type: 'success', message: `Saldo de ${p.name} zerado com sucesso.` });
                        } catch (e: any) {
                          showToast({ type: 'error', message: e?.message || 'Falha ao zerar saldo' });
                        }
                      }}
                    >
                      Zerar Estoque
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-2 text-left text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        const ok = window.confirm(`Excluir produto ${p.name}? Esta ação não pode ser desfeita.`);
                        if (!ok) return;
                        try {
                          await deleteProduct(p.id);
                          qc.invalidateQueries({ queryKey: ['products'] });
                          showToast({ type: 'success', message: `Produto ${p.name} excluído.` });
                        } catch (e: any) {
                          showToast({ type: 'error', message: e?.message || 'Falha ao excluir produto' });
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </details>
              </div>
            </div>
          );
        })}
      </div>

      <ProductFormModal
        open={openCreate}
        onOpenChange={setOpenCreate}
        mode="create"
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['products'] });
        }}
      />
      <ProductFormModal
        open={openEdit}
        onOpenChange={setOpenEdit}
        mode="edit"
        initialId={editInitial?.id}
        initialValues={{
          name: editInitial?.name,
          sku: editInitial?.sku,
          minStock: editInitial?.minStock,
          description: (editInitial as any)?.description,
        }}
        onSuccess={() => {
          setEditInitial(null);
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

      <MovementHistoryModal
        open={openHistory}
        onOpenChange={(v) => {
          setOpenHistory(v);
          if (!v) setSelectedProductId(null);
        }}
        productId={selectedProductId || ''}
      />
    </section>
  );
}

export default ProductDashboard;
