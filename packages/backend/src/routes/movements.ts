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
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
  const type = String(req.query.type || '').trim(); // IN | OUT | ''
  const from = String(req.query.from || '').trim(); // ISO date
  const to = String(req.query.to || '').trim(); // ISO date
  const q = String(req.query.q || '').trim(); // substring of note

  const where: any = { productId: id };
  if (type === 'IN' || type === 'OUT') {
    where.type = type;
  }
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) {
      where.date = { ...(where.date || {}), gte: d };
    }
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) {
      where.date = { ...(where.date || {}), lte: d };
    }
  }
  if (q) {
    where.note = { contains: q, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
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
