import { Request, Response } from 'express';
import { listLeads, getLeadById, updateLeadStatus, getLeadStats } from '../services/leads.service';

export async function getLeads(req: Request, res: Response): Promise<void> {
  const { locationId, orgId } = req.tenant!;
  const { status, page, pageSize } = req.query as {
    status?: string;
    page?: string;
    pageSize?: string;
  };

  const result = await listLeads({
    locationId,
    orgId,
    status,
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 25,
  });

  res.json(result);
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { locationId, orgId } = req.tenant!;

  try {
    const lead = await getLeadById(id, locationId, orgId);
    res.json({ lead });
  } catch {
    res.status(404).json({ error: 'Lead not found' });
  }
}

export async function patchLead(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { locationId, orgId } = req.tenant!;
  const { status, notes } = req.body as { status?: string; notes?: string };

  const validStatuses = ['new', 'contacted', 'qualified', 'booked', 'converted', 'dead'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const lead = await updateLeadStatus({ id, locationId, orgId, status: status!, notes });
    res.json({ lead });
  } catch {
    res.status(404).json({ error: 'Lead not found' });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const { locationId, orgId } = req.tenant!;
  const stats = await getLeadStats(locationId, orgId);
  res.json({ stats });
}
