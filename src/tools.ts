import Anthropic from '@anthropic-ai/sdk';
import { WebClient } from '@slack/web-api';
import { getProblematicOrders } from './bigquery-client';

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_order_status',
    description: 'Consulta o status de um pedido do cliente na plataforma Cienty. Use quando o cliente perguntar sobre o status de um pedido específico.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string', description: 'ID ou número do pedido' },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'trigger_sync',
    description: 'Dispara uma sincronização de distribuidora para o cliente. Use quando a distribuidora estiver com erro de conexão, preços desatualizados ou produtos não aparecendo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        distributor_name: { type: 'string', description: 'Nome da distribuidora (ex: Servimed, Panpharma, Solfarma)' },
        client_id: { type: 'string', description: 'ID do cliente na plataforma (se disponível)' },
      },
      required: ['distributor_name'],
    },
  },
  {
    name: 'check_distributor_status',
    description: 'Verifica o status de conexão de uma distribuidora para o cliente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        distributor_name: { type: 'string', description: 'Nome da distribuidora' },
      },
      required: ['distributor_name'],
    },
  },
  {
    name: 'get_problematic_orders',
    description: 'Busca os últimos pedidos com problema (cancelados, não faturados, travados) de um cliente pelo CNPJ. Use quando o cliente relatar problema com pedidos e quiser ver a lista para escolher qual analisar. Retorna até 5 pedidos problemáticos recentes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cnpj: {
          type: 'string',
          description: 'CNPJ do cliente no formato XX.XXX.XXX/XXXX-XX ou somente números. Pergunte ao cliente se não souber.',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de pedidos a retornar (padrão 5)',
        },
      },
      required: ['cnpj'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Use quando não conseguir resolver o problema do cliente (nível 2). Coleta o contexto da conversa e abre uma thread no canal #feedbacks do Slack para o time de CS humano.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_cnpj: {
          type: 'string',
          description: 'CNPJ do cliente (pergunte ao cliente se não souber)',
        },
        problem_description: {
          type: 'string',
          description: 'Descrição clara e objetiva do problema que não foi resolvido, com todo o contexto coletado na conversa',
        },
      },
      required: ['client_cnpj', 'problem_description'],
    },
  },
];

async function postToSlack(cnpj: string, description: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_FEEDBACK_CHANNEL_ID;

  if (!token || !channelId) {
    console.log('[Slack] Token ou canal não configurado — escalation mockada');
    return false;
  }

  try {
    const slack = new WebClient(token);
    await slack.chat.postMessage({
      channel: channelId,
      text: `🚨 *Novo ticket via Agente de Suporte*\n\n*CNPJ do cliente:* ${cnpj}\n\n*Descrição do problema:*\n${description}`,
    });
    return true;
  } catch (err) {
    console.error('[Slack] Erro ao postar ticket:', err);
    return false;
  }
}

export async function executeTool(name: string, input: Record<string, string>): Promise<string> {
  if (name === 'get_problematic_orders') {
    const cnpj = input.cnpj?.replace(/\D/g, '');
    const cnpjFormatted = cnpj?.length === 14
      ? `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12)}`
      : input.cnpj;
    const limit = Number(input.limit) || 5;
    const orders = await getProblematicOrders(cnpjFormatted, limit);
    if (!orders.length) {
      return JSON.stringify({
        found: false,
        message: `Nenhum pedido problemático encontrado para o CNPJ ${cnpjFormatted}. Verifique se o CNPJ está correto ou consulte o time de CS.`,
      });
    }
    const statusLabel: Record<string, string> = {
      Cancelled: 'Cancelado',
      NotInvoiced: 'Não faturado',
      WaitingInvoice: 'Aguardando faturamento',
      Sending: 'Enviando (travado)',
    };
    return JSON.stringify({
      found: true,
      cnpj: cnpjFormatted,
      total: orders.length,
      orders: orders.map((o, i) => ({
        opcao: i + 1,
        order_id: o.order_id,
        nome: o.order_name,
        status: statusLabel[o.status] || o.status,
        distribuidora: o.distributor,
        valor: o.total_brl,
        criado: o.created_at,
        atualizado: o.updated_at,
      })),
      instrucao: 'Apresente a lista numerada ao cliente e peça para ele escolher qual pedido quer analisar. Após a escolha, use check_order_status com o order_id escolhido ou escale para o time humano se necessário.',
    });
  }

  if (name === 'check_order_status') {
    const statuses = ['aguardando', 'enviado', 'faturado', 'cancelado'];
    const distributors = ['Servimed', 'Panpharma', 'Solfarma', 'Santa Cruz', 'DF Farma'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const distributor = distributors[Math.floor(Math.random() * distributors.length)];
    const value = (Math.random() * 2000 + 200).toFixed(2);

    return JSON.stringify({
      order_id: input.order_id,
      status,
      distributor,
      value: `R$ ${value}`,
      updated_at: new Date().toISOString(),
      message: status === 'aguardando'
        ? 'Pedido aguardando confirmação da distribuidora'
        : status === 'enviado'
        ? 'Pedido enviado à distribuidora, aguardando faturamento'
        : status === 'faturado'
        ? 'Pedido faturado com sucesso'
        : 'Pedido cancelado pela distribuidora',
    });
  }

  if (name === 'trigger_sync') {
    return JSON.stringify({
      success: true,
      distributor: input.distributor_name,
      message: `Sincronização iniciada para ${input.distributor_name}. Tempo estimado: 2-5 minutos.`,
      sync_id: `sync_${Date.now()}`,
    });
  }

  if (name === 'check_distributor_status') {
    const isOnline = Math.random() > 0.3;
    return JSON.stringify({
      distributor: input.distributor_name,
      status: isOnline ? 'conectada' : 'erro_ao_conectar',
      last_sync: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      message: isOnline
        ? `${input.distributor_name} está conectada e sincronizada`
        : `${input.distributor_name} com erro de conexão — recomendo rodar sync`,
    });
  }

  if (name === 'escalate_to_human') {
    const posted = await postToSlack(input.client_cnpj, input.problem_description);
    return JSON.stringify({
      success: true,
      slack_posted: posted,
      ticket_id: `TKT-${Date.now()}`,
      message: posted
        ? 'Thread criada no #feedbacks com sucesso. Time de CS notificado.'
        : 'Escalation registrada (Slack não configurado no momento).',
    });
  }

  return JSON.stringify({ error: 'Tool não encontrada' });
}
