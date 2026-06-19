import { supabase } from '../config/supabase';
import { scrapeWebsite, chunkContent } from './scraper.service';
import { structureWebsiteContent } from './ai.service';
import type { KnowledgeBase } from '../types';

// ============================================================
// LOOP 1: Instant Knowledge Loop
// Scrape → Structure → Store → Return editable context
// Target: <30 seconds end-to-end
// ============================================================
export async function buildKnowledgeBase(params: {
  locationId: string;
  orgId: string;
  sourceUrl: string;
  manualContent?: string;
  manualTitle?: string;
}): Promise<KnowledgeBase> {
  const { locationId, orgId, sourceUrl, manualContent, manualTitle } = params;

  // Create KB record in pending state
  const { data: kb, error: createError } = await supabase
    .from('knowledge_bases')
    .insert({
      location_id: locationId,
      org_id: orgId,
      source_url: sourceUrl,
      status: 'processing',
    })
    .select()
    .single();

  if (createError || !kb) {
    throw new Error(`Failed to create knowledge base: ${createError?.message}`);
  }

  try {
    let rawContent: string;
    let pagesScraped: number;

    if (manualContent) {
      // Manual text entry — skip scraping entirely
      console.log(`[Knowledge] Using manual content for "${manualTitle ?? sourceUrl}"...`);
      rawContent = `=== MANUAL ENTRY: ${manualTitle ?? 'Knowledge Base'} ===\n${manualContent}`;
      pagesScraped = 1;
    } else {
      // Step 1: Scrape the website
      console.log(`[Knowledge] Scraping ${sourceUrl}...`);
      const result = await scrapeWebsite(sourceUrl);
      rawContent = result.rawContent;
      pagesScraped = result.pagesScraped;

      if (!rawContent || rawContent.length < 50) {
        throw new Error(
          'Could not extract content from this URL. Try a different URL or use the Manual tab to paste content directly.'
        );
      }
    }

    // Step 2: Structure with Gemini
    console.log('[Knowledge] Structuring with Gemini...');
    const structuredData = await structureWebsiteContent(rawContent, sourceUrl);

    // Step 3: Store chunks for RAG
    const chunks = chunkContent(rawContent);
    if (chunks.length > 0) {
      const chunkRecords = chunks.map((content, idx) => ({
        kb_id: kb.id,
        location_id: locationId,
        org_id: orgId,
        content,
        chunk_index: idx,
        source_url: sourceUrl,
      }));

      await supabase.from('knowledge_chunks').insert(chunkRecords);
    }

    // Step 4: Update KB record as active
    const { data: updated, error: updateError } = await supabase
      .from('knowledge_bases')
      .update({
        raw_content: rawContent,
        structured_data: structuredData,
        status: 'active',
        pages_scraped: pagesScraped,
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', kb.id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update knowledge base: ${updateError?.message}`);
    }

    console.log(`[Knowledge] ✓ KB built: ${pagesScraped} pages, ${chunks.length} chunks`);
    return updated as KnowledgeBase;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during knowledge base build';

    await supabase
      .from('knowledge_bases')
      .update({ status: 'failed', error_message: message })
      .eq('id', kb.id);

    throw err;
  }
}

// ============================================================
// Update structured data (owner edits via dashboard)
// ============================================================
export async function updateKnowledgeStructuredData(params: {
  kbId: string;
  locationId: string;
  orgId: string;
  structuredData: Record<string, unknown>;
}): Promise<KnowledgeBase> {
  const { kbId, locationId, orgId, structuredData } = params;

  const { data, error } = await supabase
    .from('knowledge_bases')
    .update({ structured_data: structuredData })
    .eq('id', kbId)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update knowledge base: ${error?.message}`);
  }

  return data as KnowledgeBase;
}

// ============================================================
// Get active knowledge base for a location
// ============================================================
export async function getActiveKnowledgeBase(locationId: string): Promise<KnowledgeBase | null> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .order('last_scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Knowledge] Error fetching KB:', error);
    return null;
  }

  return data as KnowledgeBase | null;
}

// ============================================================
// Is a knowledge base actually usable for grounding the AI?
// A KB that exists but has no real content (just a title, or nothing)
// will cause the model to hallucinate — treat it as empty so the AI
// switches to honest "still being set up" mode instead of guessing.
// ============================================================
export function isKnowledgeBaseUsable(kb: KnowledgeBase | null): boolean {
  const d = kb?.structured_data;
  if (!d) return false;
  const hasSubstance =
    !!d.description ||
    (d.services?.length ?? 0) > 0 ||
    (d.pricing?.length ?? 0) > 0 ||
    (d.programs?.length ?? 0) > 0 ||
    (d.faq?.length ?? 0) > 0 ||
    !!d.location_summary ||
    (d.key_selling_points?.length ?? 0) > 0;
  return hasSubstance;
}

// ============================================================
// Build knowledge context string for AI prompt
// ============================================================
export function buildKnowledgeContextString(kb: KnowledgeBase): string {
  if (!kb?.structured_data) return 'No knowledge base available.';

  const d = kb.structured_data;
  const lines: string[] = [];

  // Core business identity
  if (d.title) lines.push(`BUSINESS NAME: ${d.title}`);
  if (d.description) lines.push(`ABOUT: ${d.description}`);
  if (d.location_summary) lines.push(`LOCATION DETAILS: ${d.location_summary}`);

  // Contact & hours
  if (d.hours) lines.push(`HOURS: ${d.hours}`);
  if (d.address) lines.push(`ADDRESS: ${d.address}`);
  if (d.phone) lines.push(`PHONE: ${d.phone}`);
  if (d.email) lines.push(`EMAIL: ${d.email}`);

  // Programs & age groups
  if (d.programs?.length) {
    lines.push(`\nPROGRAMS OFFERED: ${d.programs.join(', ')}`);
  }
  if (d.age_groups?.length) {
    lines.push(`AGE GROUPS SERVED: ${d.age_groups.join(', ')}`);
  }

  // Services with prices
  if (d.services?.length) {
    lines.push('\nSERVICES:');
    d.services.forEach((s) => {
      const price = s.price ? ` (${s.price})` : '';
      lines.push(`  • ${s.name}${price}: ${s.description}`);
    });
  }

  // Pricing tiers
  if (d.pricing?.length) {
    lines.push('\nPRICING:');
    d.pricing.forEach((p) => {
      lines.push(`  • ${p.tier}: ${p.price}`);
      if (p.features?.length) {
        p.features.forEach((f) => lines.push(`    - ${f}`));
      }
    });
  }

  // Key value props
  if (d.key_selling_points?.length) {
    lines.push(`\nKEY SELLING POINTS: ${d.key_selling_points.join(' | ')}`);
  }

  // FAQs — increased to 10 for better coverage
  if (d.faq?.length) {
    lines.push('\nFREQUENTLY ASKED QUESTIONS:');
    d.faq.slice(0, 10).forEach((f) => {
      lines.push(`  Q: ${f.question}`);
      lines.push(`  A: ${f.answer}`);
    });
  }

  return lines.join('\n');
}

// ============================================================
// List all knowledge bases for a location
// ============================================================
export async function listKnowledgeBases(locationId: string, orgId: string) {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('id, source_url, status, pages_scraped, last_scraped_at, created_at, structured_data')
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getKnowledgeBaseById(id: string, locationId: string, orgId: string): Promise<KnowledgeBase> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('id', id)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Knowledge base not found');
  return data as KnowledgeBase;
}
