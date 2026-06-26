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

// Allow the configured client, localhost dev, and ANY of this project's Vercel
// deployments (preview URLs + blueslate-ai.vercel.app + client-vert-nine-19…).
const staticAllowed = new Set([
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]);
app.use(cors({
  origin(origin, cb) {
    // Non-browser requests (curl, server-to-server) have no Origin — allow.
    if (!origin) return cb(null, true);
    if (staticAllowed.has(origin)) return cb(null, true);
    // Any *.vercel.app subdomain belonging to this project.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
    return cb(null, false);
  },
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
