import type { Product, ProductWithBalance } from './types';

// Base da API configurável via VITE_API_BASE em produção
// Em dev, manter vazio para usar o proxy do Vite
const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '';
const API_PREFIX = `${API_BASE}/api`;

export interface QuickOutRequest {
  productId: string;
  quantity: number;
  note?: string;
}

export interface QuickOutResponse {
  success: boolean;
  movement: {
    id: string;
    productId: string;
    type: 'OUT';
    quantity: number;
    date: string;
    note: string | null;
    createdAt: string;
  };
  newBalance: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export async function quickOutProduct(data: QuickOutRequest): Promise<QuickOutResponse> {
  const response = await fetch(`${API_PREFIX}/quick-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao processar baixa rápida');
  }

  return response.json();
}
