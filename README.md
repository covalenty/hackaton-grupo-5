# Carla — Agente de Suporte IA da Cienty

> Hackathon Cienty 2026 · Grupo 5

Sistema completo de CS (Customer Success) com IA para a Cienty — plataforma B2B de marketplace para farmácias. A **Carla** é uma agente virtual que atende clientes via web, WhatsApp e widget embeddable, com painel administrativo para o time de CS humano.

**Deploy em produção:** https://cienty-agent-968762525276.southamerica-east1.run.app

---

## Links

| Página | URL |
|---|---|
| CS Panel (admin) | `/` |
| View do cliente | `/cliente.html` |
| Widget demo | `/widget-demo.html` |
| Pitch deck | `/pitch.html` |
| Health check | `/health` |

---

## Arquitetura

```
Cliente (Web / WhatsApp)
        │
        ▼
┌─────────────────────────────────────────┐
│          Express + TypeScript           │
│                                         │
│  POST /chat          ← web / widget     │
│  POST /webhook/whatsapp ← Evolution API │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Agente Carla (agent.ts)      │    │
│  │    Claude Sonnet 4.6            │    │
│  │    Loop tool_use até resolução  │    │
│  └────────────┬────────────────────┘    │
│               │ tools                   │
│  ┌────────────▼────────────────────┐    │
│  │  get_problematic_orders → BQ    │    │
│  │  check_order_status             │    │
│  │  trigger_sync                   │    │
│  │  check_distributor_status       │    │
│  │  escalate_to_human → Slack      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
        │
        ├─ BigQuery (covalenty-prod)
        ├─ Slack API (#feedbacks)
        ├─ Evolution API (WhatsApp)
        └─ Google Natural Language API
```

---

## Funcionalidades

### Agente Carla
- Powered by **Claude Sonnet 4.6** com loop `tool_use` até resolução
- Tom adaptado ao canal: mais conciso no WhatsApp, mais detalhado na web
- Base de conhecimento: Manual SOS + mensagens reais do Slack #feedbacks + histórico WhatsApp (29k msgs)

### Tools disponíveis

| Tool | O que faz |
|---|---|
| `get_problematic_orders` | Busca últimos pedidos problemáticos do cliente no BigQuery por CNPJ (Cancelado, Travado, Não faturado) |
| `check_order_status` | Consulta status de um pedido específico |
| `trigger_sync` | Dispara sincronização de distribuidora |
| `check_distributor_status` | Verifica status de conexão de distribuidora |
| `escalate_to_human` | Abre thread no Slack #feedbacks com contexto completo |

### CS Panel (admin)
- Lista de conversas com dados reais do Clint CRM (CNPJ, GMV, stage)
- Filtros por status, agente e canal
- Badge de canal: WhatsApp / Web
- Badge de sentimento por conversa: Negativo / Neutro / Positivo — via **Google NLP em tempo real**
- Kanban drag & drop: Aguardando → IA → Humano → Resolvido IA → Resolvido Humano
- Assign de agente por conversa
- Dashboard com KPIs, gráfico de problemas, análise de sentimento agregada (Slack #feedbacks)
- Clique no sentimento mostra as mensagens reais com score NLP

### View do cliente
- Mobile-first, PWA instalável (manifest.json)
- Tela de boas-vindas com atalhos por tipo de problema
- Chat com bolhas estilo WhatsApp, indicador "digitando...", chips de resposta rápida

### Widget embeddable
- Uma linha de `<script>` para embedar no cienty.com
- Balão flutuante com hint automático após 2s

### WhatsApp via Evolution API
- Webhook configurado na instância `Gustavo-Cienty`
- 29k mensagens históricas usadas na base de conhecimento da Carla
- Respostas automáticas controladas por env var (`WHATSAPP_REPLY_ENABLED`)

### Sentimento real por mensagem
- **Google Natural Language API** analisa cada mensagem recebida individualmente
- Resultado salvo por sessão no conv-store
- Dashboard agrega sentimento do canal Slack #feedbacks (77+ mensagens analisadas)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express |
| IA | Anthropic Claude Sonnet 4.6 |
| NLP | Google Natural Language API |
| Dados | BigQuery (`covalenty-prod`) |
| CRM | Clint API + contacts.json |
| Mensageria | Slack Web API |
| WhatsApp | Evolution API v2 |
| Deploy | Google Cloud Run (`southamerica-east1`) |
| Build | Docker + Cloud Build |
| Frontend | HTML/CSS/JS vanilla + Chart.js |
| PWA | Web App Manifest |

---

## Estrutura de arquivos

```
.
├── src/
│   ├── server.ts          # Express + endpoints + webhook WhatsApp
│   ├── agent.ts           # Loop Claude tool_use + system prompt por canal
│   ├── tools.ts           # Definição e execução das tools
│   ├── bigquery-client.ts # CRM summary + pedidos problemáticos reais
│   ├── conv-store.ts      # Store in-memory: status, assignee, canal, sentimento
│   ├── sentiment.ts       # Google NLP: por mensagem e agregado
│   ├── slack-client.ts    # Fetch mensagens Slack
│   ├── clint-data.ts      # Leitura contacts.json
│   ├── analytics.ts       # Dashboard mock + dados reais
│   └── knowledge-base.ts  # Manual SOS da Cienty
├── public/
│   ├── index.html         # CS Panel (admin)
│   ├── cliente.html       # View do cliente (mobile-first)
│   ├── pitch.html         # Pitch deck hackathon
│   ├── widget.js          # Widget embeddable
│   ├── widget-demo.html   # Demo do widget
│   └── manifest.json      # PWA manifest
├── data/
│   ├── contacts.json      # Clientes reais do Clint CRM
│   └── deals.json         # Deals do pipeline
├── Dockerfile
└── .env.example
```

---

## Variáveis de ambiente

```bash
# Obrigatórias
ANTHROPIC_API_KEY=sk-ant-...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_FEEDBACK_CHANNEL_ID=C04HAPRMZ33

# WhatsApp (Evolution API)
EVOLUTION_API_URL=https://evolution.247hub.tech
EVOLUTION_INSTANCE=Gustavo-Cienty
EVOLUTION_API_KEY=...

# Controle de respostas automáticas no WhatsApp
WHATSAPP_REPLY_ENABLED=false   # trocar para true para ativar

# Porta (injetada automaticamente no Cloud Run)
PORT=3000
```

---

## Como rodar localmente

```bash
npm install
cp .env.example .env
# Preencher .env com as chaves reais

npx ts-node src/server.ts
# Acesse http://localhost:3000
```

## Deploy no Cloud Run

```bash
# Build e push da imagem
gcloud builds submit --tag gcr.io/covalenty-prod/cienty-agent

# Deploy
gcloud run deploy cienty-agent \
  --image gcr.io/covalenty-prod/cienty-agent \
  --project covalenty-prod \
  --region southamerica-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ANTHROPIC_API_KEY=...,SLACK_BOT_TOKEN=..."
```

---

## Time

| | Nome |
|---|---|
| 👩‍💼 | Carla Feitosa |
| 👨‍💻 | João |
| 👩‍🔬 | Mi |
| 🧑‍💼 | Lu |
| 👨‍💼 | Wesley |
