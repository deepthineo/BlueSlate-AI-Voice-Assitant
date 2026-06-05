import { Request, Response } from 'express';
import {
  buildKnowledgeBase,
  updateKnowledgeStructuredData,
  listKnowledgeBases,
  getKnowledgeBaseById,
} from '../services/knowledge.service';

export async function scrapeAndBuild(req: Request, res: Response): Promise<void> {
  const { sourceUrl, manualContent, manualTitle } = req.body as {
    sourceUrl: string;
    manualContent?: string;
    manualTitle?: string;
  };
  const { locationId, orgId } = req.tenant!;

  if (!sourceUrl) {
    res.status(400).json({ error: 'sourceUrl is required' });
    return;
  }

  // Allow manual:// URLs for manual text entry (skip URL validation)
  if (!sourceUrl.startsWith('manual://')) {
    try {
      new URL(sourceUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }
  }

  try {
    const kb = await buildKnowledgeBase({ locationId, orgId, sourceUrl, manualContent, manualTitle });
    res.status(201).json({ knowledgeBase: kb });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to build knowledge base';
    res.status(500).json({ error: message });
  }
}

export async function listKBs(req: Request, res: Response): Promise<void> {
  const { locationId, orgId } = req.tenant!;
  const data = await listKnowledgeBases(locationId, orgId);
  res.json({ knowledgeBases: data });
}

export async function getKB(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { locationId, orgId } = req.tenant!;

  try {
    const kb = await getKnowledgeBaseById(id, locationId, orgId);
    res.json({ knowledgeBase: kb });
  } catch {
    res.status(404).json({ error: 'Knowledge base not found' });
  }
}

export async function deleteKB(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { locationId, orgId } = req.tenant!;
  const { supabase } = await import('../config/supabase');

  // Also delete chunks
  await supabase.from('knowledge_chunks').delete().eq('kb_id', id);

  const { error } = await supabase
    .from('knowledge_bases')
    .delete()
    .eq('id', id)
    .eq('location_id', locationId)
    .eq('org_id', orgId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
}

export async function updateKB(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { locationId, orgId } = req.tenant!;
  const { structuredData } = req.body as { structuredData: Record<string, unknown> };

  if (!structuredData || typeof structuredData !== 'object') {
    res.status(400).json({ error: 'structuredData is required' });
    return;
  }

  try {
    const kb = await updateKnowledgeStructuredData({ kbId: id, locationId, orgId, structuredData });
    res.json({ knowledgeBase: kb });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
}
