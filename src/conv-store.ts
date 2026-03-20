export type ConvStatus = 'pending' | 'ai_active' | 'human_active' | 'resolved_ai' | 'resolved_human';

export type ConvChannel = 'web' | 'whatsapp';
export type ConvSentiment = 'positive' | 'neutral' | 'negative' | null;

export interface ConvMeta {
  status: ConvStatus;
  assignee: string | null;
  updatedAt: string;
  channel: ConvChannel;
  sentiment: ConvSentiment;
  sentimentScore: number | null;
  nps: number | null; // 1-10
}

export const AGENTS = [
  { id: 'carla', name: 'Carla Feitosa', avatar: '👩‍💼' },
  { id: 'joao',  name: 'João',          avatar: '👨‍💻' },
  { id: 'mi',    name: 'Mi',            avatar: '👩‍🔬' },
  { id: 'lu',    name: 'Lu',            avatar: '🧑‍💼' },
  { id: 'wes',   name: 'Ués',           avatar: '👨‍💼' },
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

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  ts: string;
}

export interface ActiveSession {
  id: string;
  name: string;       // phone number or session label
  preview: string;
  time: string;
  channel: ConvChannel;
  messages: ChatMessage[];
  meta: ConvMeta;
}

// In-memory store: convId → meta
const store = new Map<string, ConvMeta>();
// Message history: convId → messages
const msgStore = new Map<string, ChatMessage[]>();

export function getConvMeta(id: string): ConvMeta {
  return store.get(id) ?? { status: 'ai_active', assignee: 'carla', updatedAt: new Date().toISOString(), channel: 'web', sentiment: null, sentimentScore: null, nps: null };
}

export function getAllNps(): number[] {
  return Array.from(store.values()).map(m => m.nps).filter((n): n is number => n !== null);
}

export function setConvMeta(id: string, patch: Partial<ConvMeta>): ConvMeta {
  const current = getConvMeta(id);
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function addMessage(id: string, role: 'user' | 'bot', text: string): void {
  if (!msgStore.has(id)) msgStore.set(id, []);
  msgStore.get(id)!.push({ role, text, ts: new Date().toISOString() });
  // Keep last 100 messages
  const msgs = msgStore.get(id)!;
  if (msgs.length > 100) msgStore.set(id, msgs.slice(-100));
}

export function getMessages(id: string): ChatMessage[] {
  return msgStore.get(id) ?? [];
}

export function getActiveSessions(): ActiveSession[] {
  const sessions: ActiveSession[] = [];
  for (const [id, meta] of store.entries()) {
    const msgs = msgStore.get(id) ?? [];
    if (!msgs.length) continue;
    const lastMsg = msgs[msgs.length - 1];
    const firstName = id.startsWith('+') || /^\d{10,}/.test(id)
      ? `WhatsApp ${id.replace('@s.whatsapp.net','').replace('whatsapp:+','')}`
      : `Visitante · ${id.slice(-6)}`;
    sessions.push({
      id,
      name: firstName,
      preview: lastMsg.text.slice(0, 60),
      time: new Date(lastMsg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      channel: meta.channel,
      messages: msgs,
      meta,
    });
  }
  return sessions.sort((a, b) => b.messages[b.messages.length-1].ts.localeCompare(a.messages[a.messages.length-1].ts));
}

export function getAllMeta(): Map<string, ConvMeta> {
  return store;
}
