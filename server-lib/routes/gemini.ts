import { Router } from 'express';
import type { GoogleGenAI } from '@google/genai';
import { authenticate, requireRoles, asyncHandler } from '../middleware';
import { validate } from '../validate';

/**
 * Gemini AI analytics assistant. When no API key is configured the endpoint
 * returns a canned insight response so the UI still works in demo mode.
 */
export function createGeminiRouter(aiClient: GoogleGenAI | null, model: string): Router {
  const router = Router();
  router.use(authenticate, requireRoles('super_admin', 'owner', 'manager'));

  router.post('/', asyncHandler(async (req, res) => {
    const errs = validate(req.body, { prompt: { required: true, type: 'string' } });
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    if (!aiClient) {
      return res.json({
        text: `[AI Analytics Insight] Analysis for "${req.body.prompt}":\n1. Bole Branch shows peak demand between 2 PM and 6 PM.\n2. Haircut & Beard Grooming generate 42% of daily commissions.\n3. Massage Oil stock (320ml) is approaching reorder threshold (300ml).\n4. Recommend assigning 2 extra weekend masseuses and sending a promo SMS to VIPs.`,
      });
    }
    const response = await aiClient.models.generateContent({
      model,
      contents: req.body.prompt,
      config: req.body.systemInstruction ? { systemInstruction: req.body.systemInstruction, temperature: 0.7 } : undefined,
    });
    return res.json({ text: response.text });
  }));

  return router;
}
