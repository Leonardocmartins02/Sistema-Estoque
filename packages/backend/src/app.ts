import express from 'express';
import cors from 'cors';
import routes from './routes';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', routes);

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
  });

  return app;
}
