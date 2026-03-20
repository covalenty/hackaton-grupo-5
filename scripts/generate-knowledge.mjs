import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { createRequire } from 'module';

// Carrega .env manualmente
const envFile = fs.readFileSync(new URL('../.env', import.meta.url), 'utf-8');
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BASE_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = 'Gustavo-Cienty';
const OUTPUT = new URL('../KNOWLEDGE-BASE.md', import.meta.url).pathname;

async function fetchPage(page = 1, limit = 50) {
  const r = await fetch(`${BASE_URL}/chat/findMessages/${INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({ limit, page }),
  });
  if (!r.ok) return { records: [], total: 0, pages: 0 };
  const data = await r.json();
  return {
    records: data.messages?.records || [],
    total: data.messages?.total || 0,
    pages: data.messages?.pages || 0,
  };
}

function extractText(m) {
  return m.message?.conversation
    || m.message?.extendedTextMessage?.text
    || m.message?.buttonsResponseMessage?.selectedDisplayText
    || '';
}

async function fetchAll(maxPages = 20) {
  console.log(`Buscando mensagens do WhatsApp (até ${maxPages} páginas de 50)...`);
  const first = await fetchPage(1, 50);
  console.log(`Total na base: ${first.total} mensagens, ${first.pages} páginas`);

  const pagesToFetch = Math.min(maxPages, first.pages);
  const allRecords = [...first.records];

  // Busca páginas em paralelo (grupos de 5)
  for (let p = 2; p <= pagesToFetch; p += 5) {
    const batch = [];
    for (let i = p; i < p + 5 && i <= pagesToFetch; i++) batch.push(fetchPage(i, 50));
    const results = await Promise.all(batch);
    results.forEach(r => allRecords.push(...r.records));
    process.stdout.write(`\r  Páginas carregadas: ${Math.min(p + 4, pagesToFetch)}/${pagesToFetch}`);
  }
  console.log(`\nTotal de registros obtidos: ${allRecords.length}`);
  return allRecords;
}

function formatMessages(records) {
  const lines = [];
  for (const m of records) {
    const text = extractText(m);
    if (!text || text.length < 6) continue;
    const who = m.key?.fromMe ? '[Suporte]' : '[Cliente]';
    // Inclui timestamp para contexto temporal
    const ts = m.messageTimestamp
      ? new Date(Number(m.messageTimestamp) * 1000).toLocaleDateString('pt-BR')
      : '';
    lines.push(`${who}${ts ? ' (' + ts + ')' : ''}: ${text}`);
  }
  return lines;
}

async function summarizeBatch(lines, batchNum, totalBatches) {
  const content = lines.join('\n');
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Você é um analista de suporte sênior da Cienty, plataforma de compras para farmácias.

Analise este lote ${batchNum}/${totalBatches} de conversas reais entre o time de suporte e clientes (farmácias) via WhatsApp.

CONVERSAS:
${content}

Extraia e classifique:

1. PROBLEMAS REPORTADOS PELOS CLIENTES (com exemplos literais de frases usadas)
2. SOLUÇÕES APLICADAS PELO SUPORTE (o que o time fez para resolver)
3. DISTRIBUIDORAS MAIS MENCIONADAS (e contexto do problema)
4. PADRÕES DE LINGUAGEM DOS CLIENTES (como eles descrevem os problemas)
5. SITUAÇÕES QUE PRECISARAM DE ESCALAÇÃO

Seja específico. Use exemplos reais das mensagens. Ignore saudações e agradecimentos genéricos.
Máximo 600 palavras.`,
    }],
  });
  return res.content.find(b => b.type === 'text')?.text ?? '';
}

async function consolidate(summaries) {
  console.log('\nConsolidando todos os lotes em documento final...');
  const combined = summaries.map((s, i) => `=== Lote ${i + 1} ===\n${s}`).join('\n\n');
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Você é um especialista em Customer Success. Consolide estes ${summaries.length} resumos de análise de conversas de suporte da Cienty (plataforma de compras para farmácias) em um documento completo e estruturado para uso interno do time.

${combined}

Produza um documento Markdown profissional com as seguintes seções:

## Resumo Executivo
Visão geral dos principais aprendizados em 3-5 frases.

## Problemas Mais Frequentes (ranqueados por volume)
Para cada problema: descrição, como o cliente tipicamente relata, solução padrão do time.

## Distribuidoras com Mais Problemas
Ranking com contexto: qual tipo de problema cada distribuidora gera mais.

## Como os Clientes se Comunicam
Padrões de linguagem, vocabulário específico, nível de urgência típico, horários de pico se observável.

## O que o Time de Suporte Faz Bem
Boas práticas identificadas nas conversas.

## Oportunidades de Melhoria
Situações onde o atendimento poderia ser mais ágil ou eficiente.

## Respostas Padrão Recomendadas
Para os 5 problemas mais frequentes: template de resposta pronto para usar.

## Quando Escalar (N2/N3)
Critérios claros baseados nos padrões observados.

Seja concreto, use dados e exemplos reais. Escreva para o time de CS consumir e aplicar no dia a dia.`,
    }],
  });
  return res.content.find(b => b.type === 'text')?.text ?? '';
}

async function main() {
  const records = await fetchAll(20); // ~1000 mensagens
  const lines = formatMessages(records);
  console.log(`\nMensagens com texto: ${lines.length}`);
  console.log(`  Do suporte: ${lines.filter(l => l.startsWith('[Suporte]')).length}`);
  console.log(`  De clientes: ${lines.filter(l => l.startsWith('[Cliente]')).length}`);

  if (lines.length < 5) {
    console.error('Mensagens insuficientes. Verifique as credenciais da Evolution API.');
    process.exit(1);
  }

  // Divide em lotes de 80 linhas
  const BATCH = 80;
  const batches = [];
  for (let i = 0; i < lines.length; i += BATCH) batches.push(lines.slice(i, i + BATCH));
  console.log(`\nProcessando ${batches.length} lotes com Claude Haiku...`);

  const summaries = [];
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  Lote ${i + 1}/${batches.length}... `);
    try {
      const s = await summarizeBatch(batches[i], i + 1, batches.length);
      summaries.push(s);
      console.log('ok');
    } catch (err) {
      console.log(`erro: ${err.message}`);
    }
  }

  const knowledge = await consolidate(summaries);

  const header = `# Base de Conhecimento — Suporte Cienty (CarlinhIA)

> Gerado automaticamente a partir de ${records.length} conversas reais do WhatsApp
> Processado por Claude · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
> **Uso interno — time de CS Cienty**

---

`;

  const final = header + knowledge;
  fs.writeFileSync(OUTPUT, final, 'utf-8');
  console.log(`\nDocumento salvo em: ${OUTPUT}`);
  console.log(`Tamanho: ${(final.length / 1024).toFixed(1)}KB`);
}

main().catch(console.error);
