import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendToSlack(text: string): Promise<boolean> {
  const channelId = process.env.SLACK_FEEDBACK_CHANNEL_ID;
  if (!channelId || !process.env.SLACK_BOT_TOKEN) {
    console.warn('[Slack] Token ou canal não configurado, não foi possível enviar mensagem');
    return false;
  }
  try {
    await slack.chat.postMessage({ channel: channelId, text });
    console.log('[Slack] Mensagem enviada:', text.slice(0, 80));
    return true;
  } catch (err) {
    console.error('[Slack] Erro ao enviar mensagem:', err);
    return false;
  }
}

export async function fetchFeedbacksFromSlack(limit = 100): Promise<string> {
  const channelId = process.env.SLACK_FEEDBACK_CHANNEL_ID;
  if (!channelId || !process.env.SLACK_BOT_TOKEN) {
    console.log('[Slack] Token ou canal não configurado, pulando...');
    return '';
  }

  try {
    const result = await slack.conversations.history({ channel: channelId, limit });
    const messages = result.messages || [];

    // Busca threads de cada mensagem em paralelo
    const withThreads = await Promise.all(
      messages
        .filter((m: any) => m.text && m.text.length > 20)
        .map(async (m: any) => {
          let block = `- ${m.text}`;
          if (m.reply_count && m.thread_ts) {
            try {
              const thread = await slack.conversations.replies({ channel: channelId, ts: m.thread_ts });
              const replies = (thread.messages || []).slice(1); // pula a mensagem pai
              if (replies.length) {
                block += '\n' + replies
                  .filter((r: any) => r.text && r.text.length > 5)
                  .map((r: any) => `  > [resposta] ${r.text}`)
                  .join('\n');
              }
            } catch {}
          }
          return block;
        })
    );

    const text = withThreads.join('\n');
    console.log(`[Slack] ${messages.length} mensagens + threads carregados do #feedbacks`);
    return text;
  } catch (err) {
    console.error('[Slack] Erro ao buscar mensagens:', err);
    return '';
  }
}

export interface SlackMessage {
  text: string;
  ts: string;
  user?: string;
  date?: string;
}

export async function fetchSlackMessages(limit = 100): Promise<SlackMessage[]> {
  const channelId = process.env.SLACK_FEEDBACK_CHANNEL_ID;
  if (!channelId || !process.env.SLACK_BOT_TOKEN) return [];

  try {
    const result = await slack.conversations.history({ channel: channelId, limit });
    const messages = result.messages || [];
    return messages
      .filter((m: any) => m.text && m.text.length > 10 && !m.bot_id)
      .map((m: any) => ({
        text: m.text as string,
        ts: m.ts as string,
        user: m.user,
        date: new Date(parseFloat(m.ts) * 1000).toLocaleDateString('pt-BR'),
      }));
  } catch (err) {
    console.error('[Slack] Erro ao buscar mensagens:', err);
    return [];
  }
}
