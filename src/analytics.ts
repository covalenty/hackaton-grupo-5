export function getGeneralDashboard(period: 'today' | 'week' | 'month' = 'week') {
  const multiplier = period === 'today' ? 0.14 : period === 'week' ? 1 : 4.3;
  const round = (n: number) => Math.max(1, Math.round(n));
  const totalReal = 302;

  return {
    summary: {
      total_tickets: round(totalReal * multiplier),
      resolved_autonomously: round(totalReal * multiplier * 0.67),
      escalated_to_human: round(totalReal * multiplier * 0.33),
      resolution_rate: 67,
      avg_resolution_time_min: 3.2,
    },
    top_problems: [
      { problem: 'Status de distribuidora', count: round(79 * multiplier) },
      { problem: 'Dúvida sobre a plataforma', count: round(26 * multiplier) },
      { problem: 'Contato da distribuidora', count: round(18 * multiplier) },
      { problem: 'Demora no retorno', count: round(18 * multiplier) },
      { problem: 'Pedido em status "enviado"', count: round(12 * multiplier) },
      { problem: 'Cadastro de distribuidoras', count: round(11 * multiplier) },
      { problem: 'Dúvida sobre pedido', count: round(8 * multiplier) },
    ],
    sentiment: {
      positive: 45,
      neutral: 35,
      negative: 20,
      details: {
        negative: [
          { cnpj: '12.345.678/0001-90', client: 'Farmácia São João', message: 'Esse negócio não funciona, minha Solfarma tá com erro há 3 dias', date: '20/03/2026 14:32' },
          { cnpj: '98.765.432/0001-10', client: 'Drogaria Central', message: 'Pedido travado faz 2 dias e ninguém resolve, vou cancelar', date: '20/03/2026 11:15' },
          { cnpj: '55.123.456/0001-33', client: 'Farmácia Saúde+', message: 'Preço que aparece na plataforma é diferente do que chega na nota, já é a terceira vez', date: '19/03/2026 16:48' },
          { cnpj: '77.654.321/0001-55', client: 'Droganossa', message: 'Distribuidora sumiu da cotação de novo, cansei de ficar atualizando', date: '19/03/2026 09:22' },
        ],
        positive: [
          { cnpj: '11.222.333/0001-44', client: 'Farmácia Bem Estar', message: 'A Carla resolveu super rápido! Sync funcionou na hora', date: '20/03/2026 13:10' },
          { cnpj: '44.555.666/0001-77', client: 'Rede Farma SP', message: 'Muito bom o atendimento, consegui verificar meu pedido em segundos', date: '20/03/2026 10:05' },
        ],
        neutral: [
          { cnpj: '33.444.555/0001-66', client: 'Farmácia Popular', message: 'Ok, entendi como funciona o cancelamento', date: '20/03/2026 15:30' },
        ],
      },
    },
    tickets_by_day: [
      { day: 'Seg', count: round(52 * multiplier / 5) },
      { day: 'Ter', count: round(68 * multiplier / 5) },
      { day: 'Qua', count: round(45 * multiplier / 5) },
      { day: 'Qui', count: round(78 * multiplier / 5) },
      { day: 'Sex', count: round(59 * multiplier / 5) },
      { day: 'Sáb', count: round(12 * multiplier / 5) },
      { day: 'Dom', count: round(6 * multiplier / 5) },
    ],
    recent_escalations: [
      { cnpj: '12.345.678/0001-90', client: 'Farmácia São João', problem: 'Solfarma com erro persistente após 3 syncs', date: '20/03/2026', time: '14:32', sentiment: 'negative' },
      { cnpj: '98.765.432/0001-10', client: 'Drogaria Central', problem: 'Pedido #4521 travado em "enviado" há 48h — Panpharma', date: '20/03/2026', time: '11:15', sentiment: 'negative' },
      { cnpj: '45.678.901/0001-23', client: 'Farmácia Saúde+', problem: 'Divergência de preço Servimed — desconto 43% não aplicado na NF', date: '19/03/2026', time: '16:48', sentiment: 'neutral' },
    ],
  };
}

export function getClientDashboard(cnpj: string) {
  return {
    client: { cnpj, name: 'Farmácia São João', plan: 'Pro', since: '2023-04-15' },
    summary: { total_tickets: 8, resolved: 6, open: 1, escalated: 1, sentiment_score: 72, sentiment_label: 'positivo' },
    distributors: [
      { name: 'Servimed', status: 'conectada', last_sync: '10 min atrás' },
      { name: 'Panpharma', status: 'erro_ao_conectar', last_sync: '2h atrás' },
      { name: 'Solfarma', status: 'conectada', last_sync: '25 min atrás' },
      { name: 'Santa Cruz', status: 'conectada', last_sync: '1h atrás' },
    ],
    recent_tickets: [
      { id: 'TKT-001', problem: 'Panpharma com erro ao conectar', status: 'resolvido', date: '18/03/2026', time: '09:15', resolved_by: 'agente' },
      { id: 'TKT-002', problem: 'Pedido em status "enviado" há 48h — Panpharma', status: 'escalado', date: '20/03/2026', time: '09:30', resolved_by: 'humano' },
      { id: 'TKT-003', problem: 'Dúvida sobre como cancelar pedido', status: 'resolvido', date: '20/03/2026', time: '14:10', resolved_by: 'agente' },
    ],
  };
}
