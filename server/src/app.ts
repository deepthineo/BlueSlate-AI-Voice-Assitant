import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { json, urlencoded } from 'express';
import { env } from './config/env';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(urlencoded({ extended: false }));
app.use(json({ limit: '5mb' }));

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
