import { Request, Response, NextFunction } from 'express';

// Demo org + location — seeded in database/schema.sql
// In production: look up org by clerk_org_id in the organizations table.
const DEMO_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    const userId = payload.sub as string;
    if (!userId) {
      res.status(401).json({ error: 'Invalid token: missing sub' });
      return;
    }

    // Always use the seeded demo org UUID for the sprint.
    // Clerk org IDs (e.g. "org_xxx") are not UUIDs and cannot be used directly
    // as Postgres UUID foreign keys. In production, look up the DB org by
    // clerk_org_id via a supabase query and use its UUID instead.
    const orgId = DEMO_ORG_ID;

    const orgRole = (payload.org_role ?? 'org:member') as string;
    const role = orgRole === 'org:admin' ? 'org_admin' : 'location_staff';

    req.tenant = {
      orgId,
      locationId: '', // filled by requireLocation middleware
      userId,
      role: role as 'org_admin' | 'location_staff',
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireLocation(req: Request, res: Response, next: NextFunction): void {
  const raw = req.params.locationId ?? req.query.locationId ?? req.body?.locationId;
  const locationId: string | undefined = Array.isArray(raw) ? raw[0] : (raw as string | undefined);

  if (!locationId) {
    res.status(400).json({ error: 'locationId is required' });
    return;
  }

  if (req.tenant) {
    req.tenant.locationId = locationId;
  }

  next();
}

export function skipAuth(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
