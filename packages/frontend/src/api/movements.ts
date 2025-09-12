import type { Movement, Paged } from './types';

export async function fetchMovements(
  productId: string,
  page = 1,
  pageSize = 20,
  filters?: { type?: 'IN' | 'OUT' | ''; from?: string; to?: string; q?: string },
): Promise<Paged<Movement>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.type) params.set('type', filters.type);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.q) params.set('q', filters.q);
  const res = await fetch(`/api/products/${productId}/movements?${params.toString()}`);
  if (!res.ok) throw new Error('Falha ao carregar movimentações');
  return res.json();
}

export async function createMovement(
  productId: string,
  data: { type: 'IN' | 'OUT'; quantity: number; date?: string; note?: string },
): Promise<Movement> {
  console.log('Enviando requisição para criar movimentação:', { productId, data });
  try {
    const res = await fetch(`/api/products/${productId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    console.log('Resposta da API (status):', res.status);
    const responseData = await res.json().catch(() => ({}));
    console.log('Resposta da API (dados):', responseData);
    
    if (!res.ok) {
      throw new Error(responseData?.message || 'Falha ao registrar movimentação');
    }
    
    return responseData;
  } catch (error) {
    console.error('Erro na requisição createMovement:', error);
    throw error;
  }
}
