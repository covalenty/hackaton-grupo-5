import { LanguageServiceClient } from '@google-cloud/language';

const client = new LanguageServiceClient({ projectId: 'covalenty-prod' });

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  text: string;
  score: number;      // -1 (negative) to +1 (positive)
  magnitude: number;  // strength of sentiment
  label: SentimentLabel;
}

export interface AggregatedSentiment {
  positive: number;   // percentage
  neutral: number;
  negative: number;
  details: {
    positive: SentimentResult[];
    neutral: SentimentResult[];
    negative: SentimentResult[];
  };
  total: number;
}

function scoreToLabel(score: number): SentimentLabel {
  if (score >= 0.2) return 'positive';
  if (score <= -0.2) return 'negative';
  return 'neutral';
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    const [result] = await client.analyzeSentiment({
      document: { content: text, type: 'PLAIN_TEXT', language: 'pt' },
    });
    const score = result.documentSentiment?.score ?? 0;
    const magnitude = result.documentSentiment?.magnitude ?? 0;
    return { text, score, magnitude, label: scoreToLabel(score) };
  } catch {
    // Fallback: simple heuristic
    const lower = text.toLowerCase();
    const negWords = ['erro', 'falha', 'problema', 'travado', 'não funciona', 'cansei', 'cancelar', 'sumiu', 'demora', 'péssimo'];
    const posWords = ['ótimo', 'resolveu', 'funcionou', 'rápido', 'perfeito', 'obrigado', 'excelente'];
    const negScore = negWords.filter(w => lower.includes(w)).length;
    const posScore = posWords.filter(w => lower.includes(w)).length;
    const score = posScore > negScore ? 0.5 : negScore > posScore ? -0.5 : 0;
    return { text, score, magnitude: 0.5, label: scoreToLabel(score) };
  }
}

export async function analyzeMessages(messages: Array<{ text: string; meta?: Record<string, any> }>): Promise<AggregatedSentiment> {
  // Analyze in parallel (max 20 at a time to avoid quota)
  const batch = messages.slice(0, 50);
  const results = await Promise.all(batch.map(m => analyzeSentiment(m.text)));

  const withMeta = results.map((r, i) => ({ ...r, ...(messages[i].meta || {}) }));

  const pos = withMeta.filter(r => r.label === 'positive');
  const neu = withMeta.filter(r => r.label === 'neutral');
  const neg = withMeta.filter(r => r.label === 'negative');
  const total = withMeta.length || 1;

  return {
    positive: Math.round((pos.length / total) * 100),
    neutral:  Math.round((neu.length / total) * 100),
    negative: Math.round((neg.length / total) * 100),
    details: { positive: pos, neutral: neu, negative: neg },
    total: withMeta.length,
  };
}
