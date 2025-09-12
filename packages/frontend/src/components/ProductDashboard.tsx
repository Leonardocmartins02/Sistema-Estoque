import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetchProducts } from '../api/products';
import type { ProductWithBalance, Paged } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ProductFormModal } from './ProductFormModal';
import { MovementFormModal } from './MovementFormModal';
import { MovementHistoryModal } from './MovementHistoryModal';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './ui/ToastProvider';
import { createMovement } from '../api/movements';
import { deleteProduct, createProduct } from '../api/products';
import { ChevronDown, MoreHorizontal, Search, ArrowUpDown, ArrowDownNarrowWide, ArrowUpWideNarrow, Filter, Plus } from 'lucide-react';
import { DataTable, type Column, type Sort } from './ui/DataTable';
import Button from './ui/Button';
import Input from './ui/Input';
import { Select } from './ui/Select';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { createPortal } from 'react-dom';

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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // Componente interno: menu de ações com portal e posicionamento fixo para evitar clipping/rolagem
  function ActionMenu({
    trigger,
    items,
  }: {
    trigger: (args: { onClick: (e: React.MouseEvent) => void }) => React.ReactNode;
    items: React.ReactNode;
  }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number } | null>(null);

    const handleOpen = (e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const preferredTop = rect.bottom + 8;
      const preferredLeft = rect.right - 192; // ~ w-48
      const estimatedHeight = 220; // altura estimada do menu
      const willOverflowBottom = preferredTop + estimatedHeight > window.innerHeight;
      const top = willOverflowBottom ? undefined : preferredTop;
      const bottom = willOverflowBottom ? window.innerHeight - rect.top + 8 : undefined;
      const left = Math.max(8, preferredLeft);
      setPos({ top, bottom, left });
      setOpen(true);
    };

    useEffect(() => {
      if (!open) return;
      const close = () => setOpen(false);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') setOpen(false);
      };
      window.addEventListener('mousedown', close);
      window.addEventListener('keydown', onKey);
      window.addEventListener('resize', close);
      window.addEventListener('scroll', close, true);
      return () => {
        window.removeEventListener('mousedown', close);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', close);
        window.removeEventListener('scroll', close, true);
      };
    }, [open]);

    return (
      <>
        {trigger({ onClick: handleOpen })}
        {open && pos &&
          createPortal(
            <div
              className="z-[1000] w-48 rounded-md border bg-white p-1 text-sm shadow-lg"
              style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {items}
            </div>,
            document.body
          )}
      </>
    );
  }

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
    <section aria-labelledby="products-heading" className="mt-8">
      {/* Barra de ações principal */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 id="products-heading" className="text-3xl font-semibold tracking-tight text-gray-900">
            Produtos
          </h2>
          <p className="text-sm text-gray-500">Gerencie o cadastro e o estoque</p>
          <div className="mt-6">
            <Button variant="primary" size="md" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </Button>
          </div>

      {/* Barra de paginação e ações em massa — movida para baixo da tabela */}
        </div>
      </div>

      {/* (removido) Busca e filtros original — será renderizado na faixa da paginação */}

      {/* Faixa com Busca + Filtros (no lugar do total/paginação) */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Input
            id="search"
            label="Buscar por Nome ou SKU"
            type="search"
            placeholder="Ex.: Caneta ou SKU123"
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Botão de Filtros com dropdown */}
        <div className="relative">
          <details className="group inline-block">
            <summary
              aria-label="Abrir filtros"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 select-none list-none"
            >
              <Filter className="h-4 w-4" /> Filtros <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border bg-white p-3 text-sm shadow-xl">
              <div className="mb-3">
                <div className="mb-2 font-medium text-gray-800">Ordenação</div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border bg-gray-50 p-1">
                    {([
                      ['name', 'Nome'],
                      ['sku', 'SKU'],
                      ['balance', 'Saldo'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSortBy(key);
                          setPage(1);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded ${
                          sortBy === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                        }`}
                        aria-pressed={sortBy === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="inline-flex rounded-md border bg-gray-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSortDir('asc');
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        sortDir === 'asc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                      aria-pressed={sortDir === 'asc'}
                      title="Crescente"
                    >
                      <ArrowUpWideNarrow className="h-3.5 w-3.5" /> ASC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortDir('desc');
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        sortDir === 'desc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                      aria-pressed={sortDir === 'desc'}
                      title="Decrescente"
                    >
                      <ArrowDownNarrowWide className="h-3.5 w-3.5" /> DESC
                    </button>
                  </div>
                </div>
              </div>

              <div className="my-3 h-px bg-gray-200" />

              <div className="mb-2 font-medium text-gray-800">Status</div>
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
                    className={`rounded-full px-3 py-1.5 text-xs border transition ${
                      statusFilter === val
                        ? 'border-brand bg-brand text-white shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-pressed={statusFilter === val}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Ajuste os filtros e a lista será atualizada.
                </span>
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setSortBy('name');
                    setSortDir('asc');
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                  title="Limpar filtros"
                >
                  Limpar
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Tabela (desktop/tablet) com DataTable */}
      <div className="mt-6 hidden md:block">
        {(() => {
          const columns: Column<ProductWithBalance & { __actions?: true }>[] = [
            {
              key: 'name',
              header: 'Nome do Produto',
              sortable: true,
              render: (p) => (
                <div className="cursor-pointer" onClick={() => toggleExpanded((p as ProductWithBalance).id)} title="Ver descrição">
                  <div className="text-sm text-gray-900">{(p as ProductWithBalance).name}</div>
                  {expandedIds[(p as ProductWithBalance).id] && (
                    <div className="mt-2 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700">
                      <div className="mb-1 font-medium text-gray-800">Descrição</div>
                      <p className="whitespace-pre-line">{(p as ProductWithBalance).description || 'Sem descrição.'}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'sku',
              header: 'SKU',
              sortable: true,
              render: (p) => (
                <span
                  className="cursor-pointer text-sm font-medium tracking-wide text-gray-500 hover:text-gray-700 uppercase"
                  onClick={() => toggleExpanded((p as ProductWithBalance).id)}
                >
                  {(p as ProductWithBalance).sku}
                </span>
              ),
            },
            {
              key: 'balance',
              header: 'Saldo Atual',
              sortable: true,
              align: 'right',
              render: (p) => {
                const it = p as ProductWithBalance;
                const isOut = it.balance === 0;
                const isAttn = it.balance > 0 && it.balance < it.minStock;
                const cls = isOut ? 'text-rose-600' : isAttn ? 'text-amber-600' : 'text-gray-900';
                return (
                  <span className={`font-semibold ${cls}`}>{it.balance} <span className="font-normal text-gray-500">un.</span></span>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (p) => {
                const it = p as ProductWithBalance;
                const isOut = it.balance === 0;
                const isAttn = it.balance > 0 && it.balance < it.minStock;
                const isOk = it.balance >= it.minStock;
                return (
                  <span>
                    {isOk && <Badge variant="success">Em Estoque</Badge>}
                    {isAttn && <Badge variant="warning">Estoque Baixo</Badge>}
                    {isOut && <Badge variant="danger">Fora de Estoque</Badge>}
                  </span>
                );
              },
            },
            {
              key: '__actions',
              header: 'Ações',
              align: 'right',
              render: (row) => {
                const p = row as ProductWithBalance;
                return (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border px-3.5 py-1.5 text-sm hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductId(p.id);
                        setOpenMove(true);
                      }}
                      title="Lançar entrada/saída"
                    >
                      Movimentar
                    </button>
                    <ActionMenu
                      trigger={({ onClick }) => (
                        <button
                          type="button"
                          aria-label="Mais ações"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClick(e);
                          }}
                          className="inline-flex items-center rounded-md border bg-white p-1.5 text-gray-600 hover:bg-gray-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                      items={
                        <>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => {
                              setEditInitial(p);
                              setOpenEdit(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setOpenHistory(true);
                            }}
                          >
                            Ver Histórico
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-50"
                            disabled={p.balance <= 0}
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log('Zerar estoque clicado', { id: p.id, name: p.name, balance: p.balance });
                              if (p.balance <= 0) return;
                              const ok = window.confirm(`Zerar saldo de ${p.name}? Será lançada uma SAÍDA (OUT) de ${p.balance}.`);
                              if (!ok) return;
                              try {
                                console.log('Criando movimento de saída...');
                                await createMovement(p.id, { type: 'OUT', quantity: p.balance });
                                console.log('Movimento criado com sucesso');
                                await qc.invalidateQueries({ queryKey: ['products'] });
                                showToast({ type: 'success', message: `Saldo de ${p.name} zerado com sucesso.` });
                              } catch (e: any) {
                                console.error('Erro ao zerar saldo:', e);
                                showToast({ type: 'error', message: e?.message || 'Falha ao zerar saldo' });
                              }
                            }}
                          >
                            Zerar Estoque
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2.5 text-left text-red-700 hover:bg-red-50"
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log('Excluir produto clicado', { id: p.id, name: p.name });
                              const ok = window.confirm(`Excluir produto ${p.name}? Esta ação não pode ser desfeita.`);
                              if (!ok) return;
                              try {
                                console.log('Excluindo produto...');
                                await deleteProduct(p.id);
                                console.log('Produto excluído com sucesso');
                                await qc.invalidateQueries({ queryKey: ['products'] });
                                showToast({ type: 'success', message: `Produto ${p.name} excluído.` });
                              } catch (e: any) {
                                console.error('Erro ao excluir produto:', e);
                                showToast({ type: 'error', message: e?.message || 'Falha ao excluir produto' });
                              }
                            }}
                          >
                            Excluir
                          </button>
                        </>
                      }
                    />
                  </div>
                );
              },
            },
          ];

          const sort: Sort = { by: sortBy, dir: sortDir } as Sort;

          return (
            <DataTable<ProductWithBalance>
              columns={columns as any}
              items={filteredItems}
              getRowId={(p) => p.id}
              sort={sort}
              onSortChange={(s) => {
                setPage(1);
                if (s.by === 'name' || s.by === 'sku' || s.by === 'balance') {
                  setSortBy(s.by);
                }
                setSortDir(s.dir);
              }}
              isLoading={query.isLoading}
              error={query.isError ? (query.error as Error)?.message || 'Erro ao carregar produtos' : null}
              empty={<span>Nenhum produto encontrado.</span>}
              footer={
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex items-center gap-2">
                    <Select
                      aria-label="Itens por página"
                      value={currentPageSize}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setPageSize(next);
                        setPage(1);
                      }}
                      options={[10, 20, 50].map((n) => ({ value: n, label: `${n}/página` }))}
                      className="w-[130px]"
                    />
                    <button
                      type="button"
                      className="rounded-full border px-3.5 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                      disabled={items.length === 0 || query.isFetching}
                      onClick={async (e) => {
                        console.log('=== BOTÃO ZERAR PÁGINA CLICADO ===');
                        console.log('Items na página:', items);
                        console.log('Quantidade de itens:', items.length);
                        console.log('Carregando dados?', query.isFetching);
                        console.log('Botão desabilitado?', items.length === 0 || query.isFetching);
                        
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (items.length === 0) {
                          console.log('Nenhum item para zerar');
                          return;
                        }
                        
                        const totalBalance = items.reduce((acc, it) => acc + (it.balance > 0 ? it.balance : 0), 0);
                        console.log('Saldo total a ser zerado:', totalBalance);
                        
                        if (totalBalance <= 0) {
                          const msg = 'Nenhum item com saldo > 0 nesta página.';
                          console.log(msg);
                          showToast({ type: 'info', message: msg });
                          return;
                        }
                        
                        const confirmMsg = `Zerar todos os produtos desta página? Será lançada SAÍDA (OUT) total de ${totalBalance}.`;
                        console.log('Mensagem de confirmação:', confirmMsg);
                        const ok = window.confirm(confirmMsg);
                        
                        if (!ok) {
                          console.log('Usuário cancelou a operação');
                          return;
                        }
                        
                        try {
                          console.log('Iniciando processo de zerar saldos...');
                          const itemsToZero = items.filter((it) => it.balance > 0);
                          console.log(`${itemsToZero.length} itens para zerar`);
                          
                          const ops = itemsToZero.map((it) => {
                            console.log(`Criando movimento para produto ${it.id} (${it.name}): SAÍDA de ${it.balance}`);
                            return createMovement(it.id, { type: 'OUT', quantity: it.balance })
                              .then(() => console.log(`Movimento criado para produto ${it.id}`))
                              .catch(err => {
                                console.error(`Erro ao criar movimento para produto ${it.id}:`, err);
                                throw err;
                              });
                          });
                          
                          console.log('Aguardando conclusão de todas as operações...');
                          const results = await Promise.allSettled(ops);
                          
                          const failed = results.filter((r) => r.status === 'rejected');
                          console.log(`Operações concluídas: ${results.length - failed.length} sucesso, ${failed.length} falhas`);
                          
                          if (failed.length > 0) {
                            const errorMsg = `Falha ao zerar ${failed.length} de ${results.length} produtos.`;
                            console.error(errorMsg, { failed });
                            showToast({ type: 'error', message: errorMsg });
                          }
                          
                          console.log('Invalidando cache de produtos...');
                          await qc.invalidateQueries({ queryKey: ['products'] });
                          
                          const successMsg = 'Saldos da página zerados com sucesso!';
                          console.log(successMsg);
                          showToast({ type: 'success', message: successMsg });
                          
                        } catch (error) {
                          const errorMsg = 'Erro inesperado ao processar a operação';
                          console.error(errorMsg, error);
                          showToast({ type: 'error', message: errorMsg });
                        }
                      }}
                      title="Zerar todos os saldos da página"
                    >
                      Zerar página
                    </button>
                    <button
                      type="button"
                      className="rounded-full border px-3.5 py-2 text-sm hover:bg-red-50 text-red-700 border-red-300 disabled:opacity-50"
                      disabled={items.length === 0 || query.isFetching}
                      onClick={async (e) => {
                        console.log('=== BOTÃO EXCLUIR PÁGINA CLICADO ===');
                        console.log('Items na página:', items);
                        console.log('Quantidade de itens:', items.length);
                        console.log('Carregando dados?', query.isFetching);
                        console.log('Botão desabilitado?', items.length === 0 || query.isFetching);
                        
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (items.length === 0) {
                          console.log('Nenhum item para excluir');
                          return;
                        }
                        
                        const confirmMsg = `Excluir todos os ${items.length} produtos desta página? Esta ação remove os produtos e suas movimentações.`;
                        console.log('Mensagem de confirmação:', confirmMsg);
                        const ok = window.confirm(confirmMsg);
                        
                        if (!ok) {
                          console.log('Usuário cancelou a operação');
                          return;
                        }
                        
                        try {
                          console.log('Iniciando processo de exclusão...');
                          
                          const ops = items.map((it) => {
                            console.log(`Excluindo produto ${it.id} (${it.name})...`);
                            return deleteProduct(it.id)
                              .then(() => console.log(`Produto ${it.id} excluído com sucesso`))
                              .catch(err => {
                                console.error(`Erro ao excluir produto ${it.id}:`, err);
                                throw err;
                              });
                          });
                          
                          console.log('Aguardando conclusão de todas as exclusões...');
                          const results = await Promise.allSettled(ops);
                          
                          const failed = results.filter((r) => r.status === 'rejected');
                          console.log(`Exclusões concluídas: ${results.length - failed.length} sucesso, ${failed.length} falhas`);
                          
                          if (failed.length > 0) {
                            const errorMsg = `Falha ao excluir ${failed.length} de ${results.length} produtos.`;
                            console.error(errorMsg, { failed });
                            showToast({ type: 'error', message: errorMsg });
                          } else {
                            console.log('Todos os produtos foram excluídos com sucesso');
                          }
                          
                          console.log('Redirecionando para a primeira página...');
                          setPage(1);
                          
                          console.log('Invalidando cache de produtos...');
                          await qc.invalidateQueries({ queryKey: ['products'] });
                          
                          const successMsg = 'Produtos da página excluídos com sucesso!';
                          console.log(successMsg);
                          showToast({ type: 'success', message: successMsg });
                          
                        } catch (error) {
                          const errorMsg = 'Erro inesperado ao processar a exclusão';
                          console.error(errorMsg, error);
                          showToast({ type: 'error', message: errorMsg });
                        }
                      }}
                      title="Excluir todos os produtos da página"
                    >
                      Excluir página
                    </button>
                  </div>
                </div>
              }
            />
          );
        })()}
      </div>

      {/* Barra de paginação e ações em massa (abaixo da tabela) */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border px-3.5 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
            disabled={currentPage <= 1 || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600 px-2">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            className="rounded-full border px-3.5 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
            disabled={currentPage >= totalPages || query.isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima →
          </button>
        </div>
      </div>

      {/* Cards (mobile) */}
      <div className="mt-4 space-y-3 md:hidden">
        {query.isLoading && (
          <Card className="text-sm text-gray-500">Carregando...</Card>
        )}
        {query.isError && (
          <Card className="text-sm text-red-700">{(query.error as Error)?.message || 'Erro ao carregar produtos'}</Card>
        )}
        {!query.isLoading && !query.isError && filteredItems.length === 0 && (
          <Card className="text-sm text-gray-500">Nenhum produto encontrado.</Card>
        )}
        {filteredItems.map((p: ProductWithBalance) => {
          const isOut = p.balance === 0;
          const isAttn = p.balance > 0 && p.balance < p.minStock;
          const isOk = p.balance >= p.minStock;
          return (
            <Card key={p.id}>
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
                  className="rounded-full border px-3.5 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setOpenMove(true);
                  }}
                  title="Lançar entrada/saída"
                >
                  Movimentar
                </button>
                <ActionMenu
                  trigger={({ onClick }) => (
                    <button
                      type="button"
                      aria-label="Mais ações"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick(e);
                      }}
                      className="inline-flex items-center rounded-md border bg-white p-1.5 text-gray-600 hover:bg-gray-50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                  items={
                    <>
                      <button
                        type="button"
                        className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-gray-50"
                        onClick={() => {
                          setEditInitial(p);
                          setOpenEdit(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-gray-50"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setOpenHistory(true);
                        }}
                      >
                        Ver Histórico
                      </button>
                      <button
                        type="button"
                        className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
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
                        className="block w-full rounded-md px-2.5 py-2 text-left text-red-700 hover:bg-red-50"
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
                    </>
                  }
                />
              </div>
            </Card>
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
