export type ConvStatus = 'pending' | 'ai_active' | 'human_active' | 'resolved_ai' | 'resolved_human';

export type ConvChannel = 'web' | 'whatsapp';
export type ConvSentiment = 'positive' | 'neutral' | 'negative' | null;

export interface ConvMeta {
  status: ConvStatus;
  assignee: string | null;
  updatedAt: string;
  channel: ConvChannel;
  sentiment: ConvSentiment;
  sentimentScore: number | null; // -1 to +1
}

export const AGENTS = [
  { id: 'carla', name: 'Carla Feitosa', avatar: '👩‍💼' },
  { id: 'joao',  name: 'João',          avatar: '👨‍💻' },
  { id: 'mi',    name: 'Mi',            avatar: '👩‍🔬' },
  { id: 'lu',    name: 'Lu',            avatar: '🧑‍💼' },
  { id: 'wes',   name: 'Wesley',        avatar: '👨‍💼' },
];

export const STATUS_LABELS: Record<ConvStatus, string> = {
  pending:        'Aguardando',
  ai_active:      'Atendimento IA',
  human_active:   'Atendimento Humano',
  resolved_ai:    'Resolvido IA',
  resolved_human: 'Resolvido Humano',
};

export const STATUS_COLORS: Record<ConvStatus, string> = {
  pending:        '#fef9c3|#ca8a04',
  ai_active:      '#ede9fe|#7c3aed',
  human_active:   '#dbeafe|#1d4ed8',
  resolved_ai:    '#dcfce7|#16a34a',
  resolved_human: '#d1fae5|#059669',
};

// In-memory store: convId → meta
const store = new Map<string, ConvMeta>();

export function getConvMeta(id: string): ConvMeta {
  return store.get(id) ?? { status: 'ai_active', assignee: 'carla', updatedAt: new Date().toISOString(), channel: 'web', sentiment: null, sentimentScore: null };
}

export function setConvMeta(id: string, patch: Partial<ConvMeta>): ConvMeta {
  const current = getConvMeta(id);
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function getAllMeta(): Map<string, ConvMeta> {
  return store;
}
