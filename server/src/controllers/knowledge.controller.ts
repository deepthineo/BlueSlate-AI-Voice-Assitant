import { Request, Response } from 'express';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import {
  buildKnowledgeBase,
  updateKnowledgeStructuredData,
  listKnowledgeBases,
  getKnowledgeBaseById,
} from '../services/knowledge.service';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

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

export async function extractFile(req: Request, res: Response): Promise<void> {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const mime = file.mimetype;
  const name = file.originalname.replace(/\.[^.]+$/, '');

  try {
    let extractedText = '';

    if (mime === 'application/pdf') {
      // pdf-parse is a CJS module — require it to get the callable function
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      extractedText = data.text.trim();

    } else if (mime.startsWith('image/')) {
      // Use Groq vision model to extract all text/content from the image
      const b64 = file.buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${b64}`;

      const completion = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
              {
                type: 'text',
                text: 'Extract ALL text and information from this image. Return it exactly as plain text, preserving structure. Include every detail: business name, services, prices, hours, address, phone, FAQs — everything visible. Output only the extracted content, no commentary.',
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });
      extractedText = completion.choices[0].message.content?.trim() ?? '';

    } else {
      res.status(400).json({ error: 'Unsupported file type. Upload a PDF or image (PNG/JPG).' });
      return;
    }

    if (!extractedText) {
      res.status(422).json({ error: 'Could not extract any text from the file.' });
      return;
    }

    res.json({ text: extractedText, title: name });
  } catch (err: unknown) {
    console.error('[extractFile]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Extraction failed' });
  }
}
