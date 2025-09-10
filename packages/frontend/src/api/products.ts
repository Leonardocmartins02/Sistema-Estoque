import type { Product, ProductWithBalance } from './types';

export async function fetchProducts(
  search: string,
  page = 1,
  pageSize = 10,
  sortBy: 'name' | 'sku' | 'balance' = 'name',
  sortDir: 'asc' | 'desc' = 'asc',
): Promise<{ items: ProductWithBalance[]; total: number; page: number; pageSize: number }> {
  const term = search.trim();
  const params = new URLSearchParams();
  if (term) params.set('search', term);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  params.set('sortBy', sortBy);
  params.set('sortDir', sortDir);
  const qs = params.toString();
  const url = `/api/products?${qs}`;

  try {
    // Add timeout to avoid hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.message ? `: ${body.message}` : '';
      } catch {
        // ignore body parse errors
      }
      throw new Error(`Falha ao carregar produtos (HTTP ${res.status})${detail}`);
    }
    return res.json();
  } catch (err: any) {
    // Rede ou outras falhas
    if (err?.name === 'AbortError') {
      throw new Error('Tempo de resposta da API excedido. Tente novamente.');
    }
    throw new Error(err?.message || 'Falha ao carregar produtos');
  }
}

export async function createProduct(data: {
  name: string;
  sku: string;
  description?: string | null;
  minStock: number;
}): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Falha ao criar produto');
  }
  return res.json();
}

export async function updateProduct(
  id: string,
  data: Partial<{ name: string; sku: string; description?: string | null; minStock: number }>,
): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Falha ao atualizar produto');
  }
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Falha ao excluir produto');
  }
}
