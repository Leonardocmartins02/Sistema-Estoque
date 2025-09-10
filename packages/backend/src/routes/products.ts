import { Router } from 'express';
import { prisma } from '../shared/prisma';
import { z } from 'zod';

const router = Router();

router.get('/', async (req, res) => {
  const search = String(req.query.search || '').trim();

  // Normalize function to remove diacritics and lowercase
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  let products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

  if (search) {
    const nQuery = normalize(search);
    products = products.filter((p) => {
      const nName = normalize(p.name);
      const nSku = normalize(p.sku);
      return nName.includes(nQuery) || nSku.includes(nQuery);
    });
  }

  // Calculate balance per product
  const productsWithBalance = await Promise.all(
    products.map(async (p) => {
      const agg = await prisma.stockMovement.groupBy({
        by: ['type'],
        where: { productId: p.id },
        _sum: { quantity: true },
      });
      const sumIn = agg.find((a) => a.type === 'IN')?._sum.quantity || 0;
      const sumOut = agg.find((a) => a.type === 'OUT')?._sum.quantity || 0;
      return { ...p, balance: sumIn - sumOut };
    })
  );

  res.json(productsWithBalance);
});

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional().nullable(),
  minStock: z.number().int().min(0).default(0),
});

router.post('/', async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    // Ensure unique SKU
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) return res.status(409).json({ message: 'SKU já cadastrado.' });

    const created = await prisma.product.create({ data: { ...data } });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

  const agg = await prisma.stockMovement.groupBy({
    by: ['type'],
    where: { productId: id },
    _sum: { quantity: true },
  });
  const sumIn = agg.find((a) => a.type === 'IN')?._sum.quantity || 0;
  const sumOut = agg.find((a) => a.type === 'OUT')?._sum.quantity || 0;

  res.json({ ...product, balance: sumIn - sumOut });
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = productSchema.partial().parse(req.body);

    // Prevent updating to an existing SKU of another product
    if (data.sku) {
      const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existing && existing.id !== id) return res.status(409).json({ message: 'SKU já em uso.' });
    }

    const updated = await prisma.product.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});

export default router;
