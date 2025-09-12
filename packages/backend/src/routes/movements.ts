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
  console.log('Recebida requisição POST para /api/products/:id/movements', {
    params: req.params,
    body: req.body,
    headers: req.headers
  });
  
  try {
    const id = req.params.id;
    console.log('Validando dados da requisição...');
    const data = movementSchema.parse(req.body);
    console.log('Dados validados:', data);

    console.log('Buscando produto com ID:', id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.log('Produto não encontrado com ID:', id);
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    console.log('Produto encontrado:', product);

    console.log('Calculando saldo atual...');
    const agg = await prisma.stockMovement.groupBy({
      by: ['type'],
      where: { productId: id },
      _sum: { quantity: true },
    });
    const sumIn = agg.find((a) => a.type === 'IN')?._sum.quantity || 0;
    const sumOut = agg.find((a) => a.type === 'OUT')?._sum.quantity || 0;
    const balance = sumIn - sumOut;
    console.log('Saldo atual:', { sumIn, sumOut, balance });

    if (data.type === 'OUT' && data.quantity > balance) {
      console.log('Erro: Saída maior que o saldo atual', { 
        quantidade: data.quantity, 
        saldo: balance 
      });
      return res.status(422).json({ 
        message: 'Saída maior que o saldo atual do produto.' 
      });
    }

    console.log('Criando movimentação...');
    const created = await prisma.stockMovement.create({
      data: {
        productId: id,
        type: data.type,
        quantity: data.quantity,
        date: data.date ? new Date(data.date) : new Date(),
        note: data.note ?? undefined,
      },
    });
    console.log('Movimentação criada com sucesso:', created);

    res.status(201).json(created);
  } catch (err) {
    console.error('Erro ao processar requisição:', err);
    next(err);
  }
});

export default router;
