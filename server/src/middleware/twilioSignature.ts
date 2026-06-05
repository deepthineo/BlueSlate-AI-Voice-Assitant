import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { env } from '../config/env';

// Validates that webhooks are genuinely from Twilio.
// Skipped in development because ngrok URLs change and signatures won't match.
export function validateTwilioSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const signature = req.headers['x-twilio-signature'] as string;
  const url = `${env.SERVER_URL}${req.originalUrl}`;
  const params = req.body as Record<string, string>;

  const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);
  if (!valid) {
    res.status(403).json({ error: 'Invalid Twilio signature' });
    return;
  }

  next();
}
