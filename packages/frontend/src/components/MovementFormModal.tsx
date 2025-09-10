import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMovement } from '../api/movements';
import { useToast } from './ui/ToastProvider';

const schema = z.object({
  type: z.enum(['IN', 'OUT'], { required_error: 'Selecione o tipo' }),
  quantity: z.coerce.number().int().positive('Quantidade deve ser > 0'),
  date: z
    .string()
    .datetime()
    .optional()
    .or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
});

export type MovementFormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  onSuccess?: () => void;
};

export function MovementFormModal({ open, onOpenChange, productId, onSuccess }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { show: showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MovementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'IN', quantity: 1, date: '', note: '' },
  });

  async function onSubmit(values: MovementFormValues) {
    setServerError(null);
    try {
      await createMovement(productId, {
        type: values.type,
        quantity: values.quantity,
        date: values.date || undefined,
        note: values.note || undefined,
      });
      reset();
      onOpenChange(false);
      onSuccess?.();
      showToast({ type: 'success', message: 'Movimentação lançada com sucesso.' });
    } catch (e: any) {
      setServerError(e?.message || 'Falha ao lançar movimentação');
      showToast({ type: 'error', message: e?.message || 'Falha ao lançar movimentação' });
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold">Movimentar Estoque</Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-gray-600">
            Lance uma entrada (IN) ou saída (OUT) para este produto.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Tipo*
              </label>
              <select
                id="type"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('type')}
              >
                <option value="IN">Entrada (IN)</option>
                <option value="OUT">Saída (OUT)</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantidade*
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Data (opcional)
              </label>
              <input
                id="date"
                type="datetime-local"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('date')}
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-700" role="alert">
                  {errors.date.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                Observação (opcional)
              </label>
              <textarea
                id="note"
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('note')}
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
                {isSubmitting ? 'Lançando...' : 'Lançar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MovementFormModal;
