import { Router } from 'express';
import { prisma } from '../shared/prisma';
import { z } from 'zod';

const router = Router();

const quickOutSchema = z.object({
  productId: z.string().min(1, 'ID do produto é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  note: z.string().optional()
});

router.post('/', async (req, res) => {
  console.log('Recebida requisição de baixa rápida:', req.body);
  try {
    const data = req.body;
    console.log('Dados recebidos:', data);
    
    const { productId, quantity, note } = quickOutSchema.parse(data);
    console.log('Dados validados:', { productId, quantity, note });

    // Verifica se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Calcula o saldo atual
    const agg = await prisma.stockMovement.groupBy({
      by: ['type'],
      where: { productId },
      _sum: { quantity: true },
    });

    const sumIn = agg.find((a) => a.type === 'IN')?._sum.quantity || 0;
    const sumOut = agg.find((a) => a.type === 'OUT')?._sum.quantity || 0;
    const currentBalance = sumIn - sumOut;

    // Valida se há estoque suficiente
    if (quantity > currentBalance) {
      return res.status(400).json({
        message: 'Estoque insuficiente',
        details: {
          requested: quantity,
          available: currentBalance,
          product: product.name,
          productSku: product.sku
        }
      });
    }

    // Cria a movimentação de saída
    console.log('Criando movimentação de saída...');
    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        type: 'OUT',
        quantity,
        note: note || `Baixa rápida - ${quantity} un.`,
      },
    });

    // Atualiza a data de atualização do produto
    await prisma.product.update({
      where: { id: productId },
      data: { updatedAt: new Date() },
    });

    // Retorna o novo saldo
    const newBalance = currentBalance - quantity;
    
    res.json({
      success: true,
      movement,
      newBalance,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      }
    });

  } catch (error) {
    console.error('Erro ao processar baixa rápida:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors,
      });
    }
    res.status(500).json({ 
      message: 'Erro ao processar baixa',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
