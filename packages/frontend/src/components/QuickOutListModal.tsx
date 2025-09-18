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
};

export default function QuickOutListModal({ open, onOpenChange, items, onPick, loading }: QuickOutListModalProps) {
  if (!open) return null;

  const [query, setQuery] = useState('');
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((p) =>
      normalize(p.name).includes(q) || normalize(p.sku).includes(q)
    );
  }, [items, query]);

  const content = (
    <div className="fixed inset-0 z-[10000] p-4 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-gray-900">Selecionar Produto para Baixa</h2>
            <p className="mt-1 text-sm text-gray-600">Escolha um produto da lista abaixo para realizar a Baixa Rápida.</p>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
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
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[45%]">Nome do Produto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[20%]">SKU</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-600 w-[15%]">Saldo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-[20%]">Status</th>
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
                  rows.map((p) => {
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
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
