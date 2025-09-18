import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { quickOutProduct } from '../api/quickOut';
import { useToast } from './ui/ToastProvider';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

const schema = z.object({
  quantity: z.coerce.number().int().positive('Quantidade deve ser maior que zero'),
  note: z.string().optional(),
});

type QuickOutFormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    currentBalance: number;
  };
  onSuccess?: () => void;
};

export function QuickOutModal({ open, onOpenChange, product, onSuccess }: Props) {
  console.log('QuickOutModal renderizado', { 
    open, 
    product, 
    hasProduct: !!product,
    hasOnOpenChange: !!onOpenChange,
    hasOnSuccess: !!onSuccess
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { show: showToast } = useToast();
  
  // Efeito para debug
  useEffect(() => {
    console.log('QuickOutModal - open mudou para:', open);
    console.log('QuickOutModal - product:', product);
    
    if (open) {
      console.log('Modal aberto, verificando elementos no DOM...');
      const modalElement = document.querySelector('[data-testid="quick-out-modal"]');
      console.log('Elemento do modal no DOM:', modalElement);
      
      if (modalElement) {
        console.log('Estilos do modal:', window.getComputedStyle(modalElement));
        // Força o foco para o modal
        (modalElement as HTMLElement).focus();
      } else {
        console.error('Elemento do modal não encontrado no DOM');
      }
    }
  }, [open, product]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<QuickOutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, note: '' },
  });

  const quantity = watch('quantity', 1);
  const newBalance = Math.max(0, product.currentBalance - (quantity || 0));

  async function onSubmit(values: QuickOutFormValues) {
    console.log('Submetendo baixa rápida', { values, product });
    setServerError(null);
    setIsSubmitting(true);
    
    try {
      await quickOutProduct({
        productId: product.id,
        quantity: values.quantity,
        note: values.note || undefined,
      });
      
      reset();
      onOpenChange(false);
      onSuccess?.();
      
      showToast({
        type: 'success',
        message: `Baixa de ${values.quantity} unidade(s) registrada com sucesso!`,
      });
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || 'Falha ao registrar baixa';
      setServerError(errorMessage);
      showToast({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  console.log('Preparando para renderizar QuickOutModal com open =', open);
  
  if (!open) {
    console.log('QuickOutModal não renderizado (open = false)');
    return null;
  }
  
  // Versão simplificada do modal para debug
  // Valores pré-definidos para baixa rápida
  const quickAmounts = [1, 5, 10, 25, 50];

  const modalContent = (
    <div
      data-testid="quick-out-modal"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Baixa Rápida de Estoque</h2>
          <p className="text-sm text-gray-500 mt-1">
            {product.name} ({product.sku})
          </p>
        </div>
        
        <div className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Saldo Atual e Novo Saldo */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-md">
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Saldo Atual
            </label>
            <div className="text-2xl font-bold text-gray-900">
              {product.currentBalance.toLocaleString('pt-BR')} un.
            </div>
          </div>
          
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Novo Saldo
            </label>
            <div className={`text-2xl font-bold ${
              newBalance < 0 ? 'text-red-600' : 
              newBalance < 5 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {newBalance.toLocaleString('pt-BR')} un.
              {newBalance < 0 && (
                <div className="text-xs font-normal text-red-500 mt-1">Estoque negativo</div>
              )}
              {newBalance === 0 && (
                <div className="text-xs font-normal text-yellow-600 mt-1">Estoque zerado</div>
              )}
            </div>
          </div>
        </div>

        {/* Quantidade */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Quantidade para Baixa *
          </label>
          
          {/* Botões de quantidade rápida */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setValue('quantity', amount, { shouldValidate: true });
                }}
                className={`py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  quantity === amount 
                    ? 'bg-brand-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
          
          <Input
            id="quantity"
            type="number"
            min={1}
            max={product.currentBalance * 2}
            step={1}
            className="w-full text-center text-lg py-3 font-medium"
            {...register('quantity')}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              setValue('quantity', value, { shouldValidate: true });
            }}
          />
          
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600 text-center">
              {errors.quantity.message}
            </p>
          )}
          
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>Mín: 1 un.</span>
            <span>Máx: {(product.currentBalance * 2).toLocaleString('pt-BR')} un.</span>
          </div>
        </div>

        {/* Observação */}
        <div className="space-y-2">
          <label htmlFor="note" className="block text-sm font-medium text-gray-700">
            Observação (opcional)
          </label>
          <textarea
            id="note"
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
            placeholder="Ex: Motivo da baixa, destino, responsável..."
            {...register('note')}
          />
          <p className="text-xs text-gray-500">
            Máx. 255 caracteres
          </p>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {serverError}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={isSubmitting || quantity <= 0}
            isLoading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Processando...' : 'Confirmar Baixa'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  </div>
  );

  // Usa portal para evitar problemas de z-index/stacking context
  return createPortal(modalContent, document.body);
}

export default QuickOutModal;
