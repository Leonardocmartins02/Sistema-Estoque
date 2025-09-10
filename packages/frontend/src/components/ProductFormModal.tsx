import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProduct, updateProduct } from '../api/products';

const schema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  sku: z.string().min(1, 'Informe o SKU'),
  minStock: z.coerce.number().int().min(0, 'Estoque mínimo deve ser >= 0'),
  description: z.string().optional().or(z.literal('')),
});

export type ProductFormValues = z.infer<typeof schema>;

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      sku: initialValues?.sku ?? '',
      minStock: initialValues?.minStock ?? 0,
      description: initialValues?.description ?? '',
    },
  });

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    try {
      if (mode === 'create') {
        await createProduct({
          name: values.name,
          sku: values.sku,
          minStock: values.minStock,
          description: values.description || undefined,
        });
      } else if (mode === 'edit' && initialId) {
        await updateProduct(initialId, {
          name: values.name,
          sku: values.sku,
          minStock: values.minStock,
          description: values.description || undefined,
        });
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      setServerError(e?.message || 'Falha ao salvar produto');
    }
  }

  const title = mode === 'create' ? 'Novo Produto' : 'Editar Produto';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-gray-500">
            Preencha os campos abaixo. Todos os campos com * são obrigatórios.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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

            <div>
              <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
                Estoque mínimo*
              </label>
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
