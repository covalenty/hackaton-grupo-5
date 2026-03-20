import 'dotenv/config';
import express from 'express';
import path from 'path';
import { chat } from './agent';
import { fetchFeedbacksFromSlack } from './slack-client';
import { setSlackKnowledge } from './agent';
import { getGeneralDashboard, getClientDashboard } from './analytics';
import { getCRMSummary, getStagesFunnel } from './bigquery-client';
import { getConversations } from './clint-data';
import { getConvMeta, setConvMeta, AGENTS, STATUS_LABELS } from './conv-store';
import { fetchSlackMessages } from './slack-client';
import { analyzeMessages, analyzeSentiment } from './sentiment';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Busca mensagens do WhatsApp (Evolution API) para enriquecer a base de conhecimento
async function fetchWhatsAppMessages(limit = 20): Promise<string> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) return '';
  try {
    const r = await fetch(`${baseUrl}/chat/findMessages/Gustavo-Cienty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ where: { key: { fromMe: false } }, limit }),
    });
    if (!r.ok) return '';
    const data: any = await r.json();
    const msgs: any[] = Array.isArray(data) ? data : (data.messages?.records || data.records || []);
    const text = msgs
      .filter((m: any) => m.message?.conversation || m.message?.extendedTextMessage?.text)
      .map((m: any) => `- ${m.message?.conversation || m.message?.extendedTextMessage?.text}`)
      .join('\n');
    console.log(`[WhatsApp] ${msgs.length} mensagens carregadas da instância Gustavo-Cienty`);
    return text;
  } catch (err) {
    console.error('[WhatsApp] Erro ao buscar mensagens:', err);
    return '';
  }
}

async function init() {
  console.log('[Init] Carregando base de conhecimento do Slack...');
  const [slackData, waData] = await Promise.all([
    fetchFeedbacksFromSlack(200),
    fetchWhatsAppMessages(20),
  ]);
  const combined = [slackData, waData].filter(Boolean).join('\n');
  setSlackKnowledge(combined);
  console.log('[Init] Pronto! Slack + WhatsApp carregados.');
}

app.post('/chat', async (req, res) => {
  const { session_id, message, channel } = req.body;
  if (!session_id || !message) {
    return res.status(400).json({ error: 'session_id e message são obrigatórios' });
  }
  try {
    const ch: 'web' | 'whatsapp' = channel === 'whatsapp' ? 'whatsapp' : 'web';
    setConvMeta(session_id, { channel: ch });
    // Analisa sentimento da mensagem em background (não bloqueia resposta)
    analyzeSentiment(message).then(s => {
      setConvMeta(session_id, { sentiment: s.label, sentimentScore: s.score });
    }).catch(() => {});
    const reply = await chat(session_id, message, ch);
    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/dashboard/general', (req, res) => {
  const period = (req.query.period as 'today' | 'week' | 'month') || 'week';
  return res.json(getGeneralDashboard(period));
});

app.get('/api/dashboard/client', (req, res) => {
  const cnpj = (req.query.cnpj as string) || '00.000.000/0001-00';
  return res.json(getClientDashboard(cnpj));
});

// Dados reais do BigQuery
app.get('/api/crm/summary', async (_req, res) => {
  const [crm, funnel] = await Promise.all([getCRMSummary(), getStagesFunnel()]);
  return res.json({ crm, funnel });
});

app.get('/api/dashboard/sentiment-detail', (req, res) => {
  const type = (req.query.type as string) || 'negative';
  const dash = getGeneralDashboard('week');
  const details = (dash.sentiment.details as any)[type] || [];
  return res.json(details);
});

// Evolution API v2 — send text message
async function evolutionSend(to: string, text: string): Promise<void> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !instance || !apiKey) {
    console.warn('[WhatsApp] EVOLUTION_API_URL/INSTANCE/KEY não configurados');
    return;
  }
  const url = `${baseUrl}/message/sendText/${instance}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number: to, text }),
  });
  if (!r.ok) console.error('[WhatsApp] Falha ao enviar:', await r.text());
}

// Evolution API v2 webhook
// WHATSAPP_REPLY_ENABLED=true para ativar respostas automáticas
app.post('/webhook/whatsapp', async (req, res) => {
  res.sendStatus(200); // responde rápido para o Evolution não retentar
  const event = req.body?.event;
  if (event !== 'messages.upsert') return;
  const data = req.body?.data;
  if (!data || data?.key?.fromMe) return; // ignora mensagens enviadas por nós
  const remoteJid: string = data?.key?.remoteJid || '';
  const text: string = data?.message?.conversation || data?.message?.extendedTextMessage?.text || '';
  if (!text || !remoteJid) return;
  const from = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  console.log(`[WhatsApp] recebido de ${from}: ${text}`);
  setConvMeta(remoteJid, { channel: 'whatsapp' });
  // Analisa sentimento em background
  analyzeSentiment(text).then(s => {
    setConvMeta(remoteJid, { sentiment: s.label, sentimentScore: s.score });
  }).catch(() => {});

  // Respostas automáticas desabilitadas por enquanto
  if (process.env.WHATSAPP_REPLY_ENABLED !== 'true') {
    console.log('[WhatsApp] resposta automática desabilitada (WHATSAPP_REPLY_ENABLED=true para ativar)');
    return;
  }

  try {
    const reply = await chat(remoteJid, text, 'whatsapp');
    await evolutionSend(remoteJid, reply);
  } catch (err) {
    console.error('[WhatsApp] Erro:', err);
  }
});

app.get('/api/conversations', (req, res) => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const assignee = req.query.assignee as string | undefined;
  let convs = getConversations(search).map(c => ({
    ...c,
    ...getConvMeta(c.id),
  }));
  if (status && status !== 'all') convs = convs.filter(c => c.status === status);
  if (assignee && assignee !== 'all') convs = convs.filter(c => c.assignee === assignee);
  return res.json(convs);
});

app.patch('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  const { status, assignee } = req.body;
  const updated = setConvMeta(id, { ...(status && { status }), ...(assignee !== undefined && { assignee }) });
  return res.json(updated);
});

// Cache de sentimento para não chamar a API toda vez
let sentimentCache: any = null;
let sentimentCacheAt = 0;

app.get('/api/sentiment/real', async (_req, res) => {
  // Cache de 10 minutos
  if (sentimentCache && Date.now() - sentimentCacheAt < 10 * 60 * 1000) {
    return res.json(sentimentCache);
  }
  try {
    const messages = await fetchSlackMessages(80);
    if (!messages.length) {
      return res.json({ error: 'no_messages', source: 'slack_empty' });
    }
    const result = await analyzeMessages(
      messages.map(m => ({ text: m.text, meta: { date: m.date, source: '#feedbacks' } }))
    );
    sentimentCache = { ...result, source: 'real', total_messages: messages.length };
    sentimentCacheAt = Date.now();
    return res.json(sentimentCache);
  } catch (err: any) {
    console.error('[Sentiment]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents', (_req, res) => res.json(AGENTS));
app.get('/api/statuses', (_req, res) => res.json(STATUS_LABELS));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`[Server] Rodando em http://localhost:${PORT}`);
  await init();
});
