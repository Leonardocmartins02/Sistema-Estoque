import type { Product, ProductWithBalance } from './types';

export async function fetchProducts(search: string): Promise<ProductWithBalance[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());

  const res = await fetch(`/api/products?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Falha ao carregar produtos');
  }
  return res.json();
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
