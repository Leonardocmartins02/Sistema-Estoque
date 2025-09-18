import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import type { ProductWithBalance } from '../api/types';

export type QuickOutListModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: ProductWithBalance[];
  onPick: (p: ProductWithBalance) => void;
  loading?: boolean;
  onOpenHistory?: () => void;
};

export default function QuickOutListModal({ open, onOpenChange, items, onPick, loading, onOpenHistory }: QuickOutListModalProps) {
  if (!open) return null;

  const [query, setQuery] = useState('');
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Estado de ordenação e filtro clicáveis no cabeçalho
  type SortDir = 'asc' | 'desc';
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'balance'>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  type StatusKey = 'ALL' | 'OK' | 'ATTN' | 'OUT';
  const [statusCycle, setStatusCycle] = useState<StatusKey>('ALL');

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    let filtered = items.filter((p) => {
      const matchesQuery = !q || normalize(p.name).includes(q) || normalize(p.sku).includes(q);
      if (statusCycle === 'ALL') return matchesQuery;
      const isOut = p.balance === 0;
      const isAttn = p.balance > 0 && p.balance < p.minStock;
      const isOk = p.balance >= p.minStock;
      if (statusCycle === 'OK') return matchesQuery && isOk;
      if (statusCycle === 'ATTN') return matchesQuery && isAttn;
      if (statusCycle === 'OUT') return matchesQuery && isOut;
      return matchesQuery;
    });
    // Ordenação simples client-side
    filtered = [...filtered].sort((a, b) => {
      let av: any = sortBy === 'balance' ? a.balance : sortBy === 'sku' ? a.sku : a.name;
      let bv: any = sortBy === 'balance' ? b.balance : sortBy === 'sku' ? b.sku : b.name;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [items, query, statusCycle, sortBy, sortDir]);

  // Paginação local
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const start = (page - 1) * pageSize;
  const pageItems = rows.slice(start, start + pageSize);

  const content = (
    <div className="fixed inset-0 z-[10000] p-4 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-gray-900">Selecionar Produto para Baixa</h2>
            <p className="mt-1 text-sm text-gray-600">Escolha um produto da lista abaixo para realizar a Baixa Rápida ou visualize o histórico de baixas.</p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenHistory && (
              <Button variant="secondary" onClick={() => onOpenHistory?.()}>Histórico de Baixas</Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              placeholder="Buscar por Nome ou SKU"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {loading ? '...' : `${rows.length} item(ns)`}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[45%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                      onClick={() => {
                        setSortBy('name');
                        setSortDir((d) => (sortBy === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
                      }}
                      title="Ordenar por Nome"
                    >
                      Nome do Produto
                      <span className={`text-gray-400 ${sortBy==='name' && sortDir==='desc' ? 'rotate-180' : ''}`}>▲</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[20%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                      onClick={() => {
                        setSortBy('sku');
                        setSortDir((d) => (sortBy === 'sku' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
                      }}
                      title="Ordenar por SKU"
                    >
                      SKU
                      <span className={`text-gray-400 ${sortBy==='sku' && sortDir==='desc' ? 'rotate-180' : ''}`}>▲</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-600 w-[15%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                      onClick={() => {
                        setSortBy('balance');
                        setSortDir((d) => (sortBy === 'balance' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
                      }}
                      title="Ordenar por Saldo"
                    >
                      Saldo
                      <span className={`text-gray-400 ${sortBy==='balance' && sortDir==='desc' ? 'rotate-180' : ''}`}>▲</span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[20%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 hover:text-gray-800"
                      onClick={() => {
                        setStatusCycle((prev) => (prev === 'ALL' ? 'OK' : prev === 'OK' ? 'ATTN' : prev === 'ATTN' ? 'OUT' : 'ALL'));
                      }}
                      title="Filtrar por Status (clique para alternar)"
                    >
                      Status
                      <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-600">
                        {statusCycle === 'ALL' ? 'Todos' : statusCycle === 'OK' ? 'OK' : statusCycle === 'ATTN' ? 'Atenção' : 'Em falta'}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">Carregando produtos...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">Nenhum produto disponível.</td>
                  </tr>
                ) : (
                  pageItems.map((p) => {
                    const isOut = p.balance === 0;
                    const isAttn = p.balance > 0 && p.balance < p.minStock;
                    const isOk = p.balance >= p.minStock;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onPick(p)}>
                        <td className="border-t border-gray-100 px-4 py-3 text-sm text-gray-800">{p.name}</td>
                        <td className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600 uppercase">{p.sku}</td>
                        <td className="border-t border-gray-100 px-4 py-3 text-sm text-gray-800 text-right">{p.balance} <span className="text-gray-500">un.</span></td>
                        <td className="border-t border-gray-100 px-4 py-3 text-sm">
                          {isOk && <Badge variant="success">Em Estoque</Badge>}
                          {isAttn && <Badge variant="warning">Estoque Baixo</Badge>}
                          {isOut && <Badge variant="danger">Fora de Estoque</Badge>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">Página {page} de {totalPages}</div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10,20,50].map(n => <option key={n} value={n}>{n}/página</option>)}
              </select>
              <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page<=1}>Anterior</Button>
              <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page>=totalPages}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
