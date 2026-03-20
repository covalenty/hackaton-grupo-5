import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchAllWhatsAppMessages(limit = 1000): Promise<string[]> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) return [];
  try {
    // Busca ambos os lados da conversa — mensagens do suporte contêm o conhecimento real
    const r = await fetch(`${baseUrl}/chat/findMessages/Gustavo-Cienty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ limit }),
    });
    if (!r.ok) return [];
    const data: any = await r.json();
    const msgs: any[] = Array.isArray(data) ? data : (data.messages?.records || data.records || []);
    return msgs
      .filter((m: any) => m.message?.conversation || m.message?.extendedTextMessage?.text)
      .map((m: any) => {
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
        const who = m.key?.fromMe ? '[Suporte]' : '[Cliente]';
        return `${who} ${text}`;
      })
      .filter((t: string) => t.length > 15);
  } catch (err) {
    console.error('[KnowledgeBuilder] Erro ao buscar mensagens:', err);
    return [];
  }
}

async function summarizeBatch(messages: string[], batchIndex: number, total: number): Promise<string> {
  const numbered = messages.map((m, i) => `${i + 1}. ${m}`).join('\n');
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Você é um analista de suporte da Cienty — plataforma de compras para farmácias.
Analise estas ${messages.length} mensagens reais de clientes (farmácias) recebidas via WhatsApp e extraia insights para treinar um agente de suporte.

MENSAGENS (lote ${batchIndex + 1} de ${total}):
${numbered}

Extraia e estruture:
1. Problemas mais citados (com exemplos de como o cliente descreve)
2. Distribuidoras mais mencionadas com problema
3. Dúvidas recorrentes sobre pedidos ou plataforma
4. Expressões e linguagem típica dos farmacêuticos

Seja específico, use exemplos reais das mensagens. Máximo 400 palavras.`,
    }],
  });
  return response.content.find(b => b.type === 'text')?.text ?? '';
}

async function consolidateSummaries(summaries: string[]): Promise<string> {
  const combined = summaries.map((s, i) => `=== Lote ${i + 1} ===\n${s}`).join('\n\n');
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Consolide estes ${summaries.length} resumos de análise de mensagens de clientes da Cienty (farmácias) em uma única base de conhecimento para uso por um agente de suporte chamado Carla.

${combined}

Produza um guia estruturado com:
## Problemas Frequentes (ranqueados)
Liste os problemas mais comuns com exemplos reais de como o cliente descreve.

## Distribuidoras Problemáticas
Quais distribuidoras geram mais reclamações e por quê.

## Dúvidas Recorrentes
Perguntas que aparecem com frequência sobre pedidos, preços, cotação.

## Linguagem dos Clientes
Como os farmacêuticos se expressam — vocabulário, abreviações, tom — para a Carla se comunicar melhor.

## Alertas para Escalação
Situações que tipicamente precisam de atendimento humano.

Máximo 700 palavras. Seja direto e útil para um agente de suporte.`,
    }],
  });
  return response.content.find(b => b.type === 'text')?.text ?? summaries.join('\n\n');
}

export async function buildWhatsAppKnowledge(): Promise<string> {
  console.log('[KnowledgeBuilder] Buscando até 1000 mensagens do WhatsApp...');
  const messages = await fetchAllWhatsAppMessages(1000);

  if (messages.length < 5) {
    console.log(`[KnowledgeBuilder] Apenas ${messages.length} mensagens — pulando sumarização`);
    return messages.map(m => `- ${m}`).join('\n');
  }

  console.log(`[KnowledgeBuilder] ${messages.length} mensagens encontradas, sumarizando em batches...`);

  const BATCH_SIZE = 150;
  const batches: string[][] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  const summaries: string[] = [];
  for (let i = 0; i < batches.length; i++) {
    try {
      const summary = await summarizeBatch(batches[i], i, batches.length);
      if (summary) summaries.push(summary);
      console.log(`[KnowledgeBuilder] Lote ${i + 1}/${batches.length} processado`);
    } catch (err) {
      console.error(`[KnowledgeBuilder] Erro no lote ${i + 1}:`, err);
    }
  }

  if (!summaries.length) return '';

  if (summaries.length === 1) {
    console.log('[KnowledgeBuilder] Base de conhecimento pronta (1 lote)');
    return summaries[0];
  }

  try {
    const final = await consolidateSummaries(summaries);
    console.log(`[KnowledgeBuilder] Base consolidada de ${messages.length} mensagens em ${summaries.length} lotes`);
    return final;
  } catch (err) {
    console.error('[KnowledgeBuilder] Erro na consolidação:', err);
    return summaries.join('\n\n');
  }
}
