import 'dotenv/config';
import express from 'express';
import path from 'path';
import { chat } from './agent';
import { fetchFeedbacksFromSlack } from './slack-client';
import { setSlackKnowledge } from './agent';
import { buildWhatsAppKnowledge } from './knowledge-builder';
import { getGeneralDashboard, getClientDashboard } from './analytics';
import { getCRMSummary, getStagesFunnel } from './bigquery-client';
import { getConversations } from './clint-data';
import { getConvMeta, setConvMeta, AGENTS, STATUS_LABELS, getAllNps, addMessage, getMessages, getActiveSessions } from './conv-store';
import { fetchSlackMessages, sendToSlack } from './slack-client';
import { analyzeMessages } from './sentiment';
import Anthropic from '@anthropic-ai/sdk';

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
  console.log('[Init] Carregando base de conhecimento...');
  // Slack rápido para ter algo imediato
  const slackData = await fetchFeedbacksFromSlack(30);
  if (slackData) {
    setSlackKnowledge(slackData);
    console.log('[Init] Slack carregado. Servidor pronto para atender.');
  }
  // WhatsApp: processa 1000 mensagens em background com sumarização via Claude
  buildWhatsAppKnowledge()
    .then(waKnowledge => {
      if (waKnowledge) {
        const combined = [waKnowledge, slackData].filter(Boolean).join('\n\n---\n\n');
        setSlackKnowledge(combined);
        console.log('[Init] Base de conhecimento do WhatsApp integrada com sucesso.');
      }
    })
    .catch(err => console.error('[Init] Erro ao construir base WhatsApp:', err));
}

app.post('/chat', async (req, res) => {
  const { session_id, message, channel } = req.body;
  if (!session_id || !message) {
    return res.status(400).json({ error: 'session_id e message são obrigatórios' });
  }
  try {
    const ch: 'web' | 'whatsapp' = channel === 'whatsapp' ? 'whatsapp' : 'web';
    setConvMeta(session_id, { channel: ch });
    addMessage(session_id, 'user', message);
    const reply = await chat(session_id, message, ch);
    addMessage(session_id, 'bot', reply);
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
  addMessage(remoteJid, 'user', text);

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

// Sessões ativas (web + whatsapp) com histórico de mensagens
app.get('/api/sessions', (_req, res) => {
  return res.json(getActiveSessions());
});

app.get('/api/sessions/:id/messages', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  return res.json(getMessages(id));
});

// Admin responde diretamente em uma sessão (human takeover)
app.post('/api/sessions/:id/reply', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message obrigatório' });
  addMessage(id, 'bot', `[Humano] ${message}`);
  setConvMeta(id, { status: 'human_active' });
  return res.json({ ok: true });
});

// Escalar conversa para Slack: resume o problema e posta no canal
app.post('/api/sessions/:id/escalate', async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const msgs = getMessages(id);
  if (!msgs.length) return res.status(400).json({ error: 'Sem mensagens nesta sessão' });

  const transcript = msgs.slice(-20)
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.text}`)
    .join('\n');

  let summary = '';
  try {
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Analise esta conversa de suporte e responda APENAS com uma linha no formato exato:\nCNPJ: descrição do problema em até 10 palavras\n\nSe não houver CNPJ na conversa, use "Visitante" no lugar do CNPJ. Nada mais além dessa linha.\n\nCONVERSA:\n${transcript}`,
      }],
    });
    summary = (r.content.find((b: any) => b.type === 'text') as any)?.text?.trim() ?? '';
  } catch (err) {
    console.error('[Escalate] Erro ao resumir:', err);
  }

  if (!summary) summary = `${id.slice(0, 20)}: Problema reportado pelo cliente`;

  const slackText = `🔴 *Escalonamento CarlinhIA* — ${summary}`;
  const sent = await sendToSlack(slackText);
  if (!sent) return res.status(500).json({ error: 'Falha ao enviar para Slack' });

  setConvMeta(id, { status: 'human_active' });
  return res.json({ ok: true, summary });
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
  if (sentimentCache && Date.now() - sentimentCacheAt < 10 * 60 * 1000) {
    return res.json(sentimentCache);
  }
  try {
    // Usa mensagens do WhatsApp como fonte primária, Slack como fallback
    let messages: { text: string; meta: any }[] = [];
    const waMsgs = await fetchWhatsAppMessages(50);
    if (waMsgs) {
      messages = waMsgs.split('\n')
        .filter(l => l.startsWith('- ') && l.length > 12)
        .map(l => ({ text: l.slice(2), meta: { source: 'WhatsApp' } }));
    }
    if (messages.length < 10) {
      const slackMsgs = await fetchSlackMessages(60);
      messages = messages.concat(slackMsgs.map(m => ({ text: m.text, meta: { date: m.date, source: '#feedbacks' } })));
    }
    if (!messages.length) return res.json({ error: 'no_messages' });
    const result = await analyzeMessages(messages);
    sentimentCache = { ...result, source: 'real', total_messages: messages.length };
    sentimentCacheAt = Date.now();
    return res.json(sentimentCache);
  } catch (err: any) {
    console.error('[Sentiment]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// NPS endpoints
app.post('/api/nps', (req, res) => {
  const { session_id, score } = req.body;
  if (!session_id || typeof score !== 'number' || score < 1 || score > 10) {
    return res.status(400).json({ error: 'session_id e score (1-10) obrigatórios' });
  }
  setConvMeta(session_id, { nps: score });
  return res.json({ ok: true });
});

app.get('/api/nps/summary', (_req, res) => {
  const scores = getAllNps();
  if (!scores.length) return res.json({ avg: null, total: 0, promoters: 0, detractors: 0, passive: 0, nps: null });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  const passive = scores.filter(s => s === 7 || s === 8).length;
  const nps = Math.round(((promoters - detractors) / scores.length) * 100);
  return res.json({ avg: avg.toFixed(1), total: scores.length, promoters, detractors, passive, nps });
});

app.get('/api/agents', (_req, res) => res.json(AGENTS));
app.get('/api/statuses', (_req, res) => res.json(STATUS_LABELS));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`[Server] Rodando em http://localhost:${PORT}`);
  await init();
});
