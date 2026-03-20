import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function fetchFeedbacksFromSlack(limit = 100): Promise<string> {
  const channelId = process.env.SLACK_FEEDBACK_CHANNEL_ID;
  if (!channelId || !process.env.SLACK_BOT_TOKEN) {
    console.log('[Slack] Token ou canal não configurado, pulando...');
    return '';
  }

  try {
    const result = await slack.conversations.history({ channel: channelId, limit });
    const messages = result.messages || [];
    const text = messages
      .filter((m) => m.text && m.text.length > 20)
      .map((m) => `- ${m.text}`)
      .join('\n');
    console.log(`[Slack] ${messages.length} mensagens carregadas do #feedbacks`);
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
