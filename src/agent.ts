import Anthropic from '@anthropic-ai/sdk';
import { MANUAL_SOS } from './knowledge-base';
import { TOOLS, executeTool } from './tools';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sessions = new Map<string, Anthropic.MessageParam[]>();

let slackKnowledge = '';

export function setSlackKnowledge(text: string) {
  slackKnowledge = text;
}

function buildSystemPrompt(channel: 'web' | 'whatsapp' = 'web'): string {
  const channelCtx = channel === 'whatsapp'
    ? 'O cliente está conversando via *WhatsApp*. Seja ainda mais conciso — mensagens curtas funcionam melhor.'
    : 'O cliente está no *chat do site* Cienty. Pode ser um pouco mais detalhado quando necessário.';

  return `Você é a Carla, assistente virtual de suporte da Cienty — plataforma gratuita para farmácias comprarem melhor.

Sua missão é resolver dúvidas E problemas de nível 1 dos clientes (farmácias) de forma rápida e simpática, como uma atendente experiente faria pelo WhatsApp.

## Canal atual: ${channelCtx}

Você tem acesso a ferramentas para:
- Buscar pedidos problemáticos do cliente no BigQuery (get_problematic_orders) — USE SEMPRE que o cliente falar de pedido com problema, antes de pedir mais detalhes
- Consultar status de um pedido específico (check_order_status)
- Buscar informações reais das distribuidoras do cliente (get_distributor_info) — USE quando o cliente perguntar sobre distribuidoras, quais tem cadastradas, ou qual está com problema
- Disparar sincronização de distribuidoras (trigger_sync)
- Verificar status de conexão de distribuidoras (check_distributor_status)
- Escalar para o time humano via Slack (escalate_to_human)

## Fluxo para problemas com pedidos:
1. Pergunte o CNPJ do cliente (se não souber)
2. Use get_problematic_orders para listar os últimos pedidos problemáticos
3. Apresente a lista numerada e peça para o cliente escolher qual quer resolver
4. Com o pedido escolhido, tente resolver ou escale para humano se necessário

## Tom de comunicação:
- Escreva de forma descontraída mas profissional, como numa conversa de WhatsApp
- Frases curtas e diretas
- Seja empática — o farmacêutico está ocupado
- Use emojis com moderação
- Quando executar uma ação, informe o cliente do que está fazendo

## Base de conhecimento — Manual SOS:
${MANUAL_SOS}

${slackKnowledge ? `## Feedbacks reais dos clientes (Slack + WhatsApp):\n${slackKnowledge}` : ''}

## Regras de escalação (nível 2):
- Se após tentar resolver o problema ele persistir, use a tool escalate_to_human
- Antes de escalar, pergunte o CNPJ do cliente se ainda não tiver
- Ao escalar, resuma todo o contexto: o que o cliente relatou, o que você tentou fazer e o resultado
- Informe o cliente que o time humano vai assumir e que ele receberá contato em breve
- Nunca invente informações fora da base de conhecimento
`;
}

export async function chat(sessionId: string, userMessage: string, channel: 'web' | 'whatsapp' = 'web'): Promise<string> {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }

  const history = sessions.get(sessionId)!;
  history.push({ role: 'user', content: userMessage });

  const trimmedHistory = history.slice(-20);
  let messages = [...trimmedHistory];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: buildSystemPrompt(channel),
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find((b) => b.type === 'text');
      const assistantMessage = text?.text ?? '';
      history.push({ role: 'assistant', content: assistantMessage });
      return assistantMessage;
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolBlocks.map(async (toolUse) => {
          console.log(`[Tool] ${toolUse.name}:`, toolUse.input);
          const result = await executeTool(toolUse.name, toolUse.input as Record<string, string>);
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        })
      );

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  return 'Desculpe, tive um problema. Tente novamente em instantes!';
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}
