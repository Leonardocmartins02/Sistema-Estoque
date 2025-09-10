import { Router } from 'express';
import products from './products';
import movements from './movements';

const router = Router();

router.use('/products', products);
router.use('/products', movements); // nested under /products/:id/movements

export default router;
