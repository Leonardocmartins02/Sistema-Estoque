import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProduct, updateProduct } from '../api/products';
import { useToast } from './ui/ToastProvider';

const schema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  sku: z.string().min(1, 'Informe o SKU'),
  minStock: z.coerce.number().int().min(0, 'Estoque mínimo deve ser >= 0'),
  initialStock: z.coerce
    .number()
    .int()
    .min(0, 'Estoque inicial deve ser >= 0')
    .default(0),
  description: z.string().optional().or(z.literal('')),
});

// Types aligned with ZodResolver: input (raw) vs output (after coercion/defaults)
export type ProductFormInput = z.input<typeof schema>;
export type ProductFormValues = z.output<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  initialId?: string;
  initialValues?: Partial<ProductFormValues>;
  onSuccess?: () => void;
};

export function ProductFormModal({ open, onOpenChange, mode, initialId, initialValues, onSuccess }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { show: showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      sku: initialValues?.sku ?? '',
      minStock: initialValues?.minStock ?? 0,
      initialStock: 0,
      description: initialValues?.description ?? '',
    },
  });

  // Submit logic is inlined into handleSubmit below to simplify generic typing

  const title = mode === 'create' ? 'Novo Produto' : 'Editar Produto';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-gray-600">
            Preencha os campos abaixo. Todos os campos com * são obrigatórios.
          </Dialog.Description>

          <form
            onSubmit={handleSubmit(async (values) => {
              setServerError(null);
              try {
                if (mode === 'create') {
                  await createProduct({
                    name: values.name,
                    sku: values.sku,
                    minStock: values.minStock,
                    initialStock: values.initialStock ?? 0,
                    description: values.description || undefined,
                  });
                  showToast({ type: 'success', message: 'Produto criado com sucesso.' });
                } else if (mode === 'edit' && initialId) {
                  await updateProduct(initialId, {
                    name: values.name,
                    sku: values.sku,
                    minStock: values.minStock,
                    description: values.description || undefined,
                  });
                  showToast({ type: 'success', message: 'Produto atualizado com sucesso.' });
                }
                reset();
                onOpenChange(false);
                onSuccess?.();
              } catch (e: any) {
                setServerError(e?.message || 'Falha ao salvar produto');
                showToast({ type: 'error', message: e?.message || 'Falha ao salvar produto' });
              }
            })}
            className="space-y-3"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome*
              </label>
              <input
                id="name"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                SKU*
              </label>
              <input
                id="sku"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 uppercase tracking-wide focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('sku')}
              />
              {errors.sku && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.sku.message}
                </p>
              )}
            </div>

            {mode === 'create' && (
              <div>
                <label htmlFor="initialStock" className="block text-sm font-medium text-gray-700">
                  Estoque inicial (opcional)
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Se informado, será lançado automaticamente como uma <strong>Entrada (IN)</strong> ao salvar o produto.
                </p>
                <input
                  id="initialStock"
                  type="number"
                  min={0}
                  placeholder="Ex.: 10"
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                  {...register('initialStock')}
                />
                {errors.initialStock && (
                  <p className="mt-1 text-xs text-red-700" role="alert">
                    {errors.initialStock.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
                Estoque mínimo*
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Usado apenas para <strong>alerta</strong> na lista quando o saldo ficar abaixo desse valor. Não altera o saldo.
              </p>
              <input
                id="minStock"
                type="number"
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('minStock')}
              />
              {errors.minStock && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.minStock.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('description')}
              />
            </div>

            {serverError && (
              <p className="text-sm text-red-700" role="alert">
                {serverError}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-brand px-4 py-2 text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ProductFormModal;
