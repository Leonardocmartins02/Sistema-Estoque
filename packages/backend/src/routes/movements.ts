import { Router } from 'express';
import { prisma } from '../shared/prisma';
import { z } from 'zod';

const router = Router();

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive(),
  date: z.string().datetime().optional(),
  note: z.string().optional().nullable(),
});

router.get('/:id/movements', async (req, res) => {
  const id = req.params.id;
  const page = Number(req.query.page || 1);
  const pageSize = Math.min(Number(req.query.pageSize || 20), 100);

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where: { productId: id } }),
  ]);

  res.json({ items, total, page, pageSize });
});

router.post('/:id/movements', async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = movementSchema.parse(req.body);

    // Validate product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

    // Compute current balance
    const agg = await prisma.stockMovement.groupBy({
      by: ['type'],
      where: { productId: id },
      _sum: { quantity: true },
    });
    const sumIn = agg.find((a) => a.type === 'IN')?._sum.quantity || 0;
    const sumOut = agg.find((a) => a.type === 'OUT')?._sum.quantity || 0;
    const balance = sumIn - sumOut;

    if (data.type === 'OUT' && data.quantity > balance) {
      return res.status(422).json({ message: 'Saída maior que o saldo atual do produto.' });
    }

    const created = await prisma.stockMovement.create({
      data: {
        productId: id,
        type: data.type,
        quantity: data.quantity,
        date: data.date ? new Date(data.date) : new Date(),
        note: data.note ?? undefined,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
