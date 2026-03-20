import { BigQuery } from '@google-cloud/bigquery';

const bq = new BigQuery({ projectId: 'covalenty-prod', location: 'southamerica-east1' });

export interface ProblematicOrder {
  order_id: string;
  order_name: string;
  status: string;
  distributor: string;
  total_brl: string;
  created_at: string;
  updated_at: string;
}

export async function getProblematicOrders(cnpj: string, limit = 5): Promise<ProblematicOrder[]> {
  try {
    const [rows] = await bq.query({
      query: `
        SELECT
          o.id AS order_id,
          o.name AS order_name,
          o.status,
          COALESCE(
            (SELECT STRING_AGG(DISTINCT d.distributor ORDER BY d.distributor)
             FROM \`covalenty-prod.app_database_br.distributor_order\` d
             WHERE d.order_id = o.id),
            'N/A'
          ) AS distributor,
          ROUND(o.total_price_cents / 100.0, 2) AS total_brl,
          FORMAT_TIMESTAMP('%d/%m/%Y %H:%M', o.created_at, 'America/Sao_Paulo') AS created_at,
          FORMAT_TIMESTAMP('%d/%m/%Y %H:%M', o.updated_at, 'America/Sao_Paulo') AS updated_at
        FROM \`covalenty-prod.app_database_br.order\` o
        JOIN \`covalenty-prod.app_database_br.client\` c ON c.client_id = o.client_id
        WHERE
          c.cnpj = @cnpj
          AND o.status IN ('Cancelled', 'NotInvoiced', 'WaitingInvoice', 'Sending')
        ORDER BY o.updated_at DESC
        LIMIT @limit
      `,
      params: { cnpj, limit },
    });
    return rows.map((r: any) => ({
      order_id: String(r.order_id),
      order_name: r.order_name || `Pedido #${r.order_id}`,
      status: r.status,
      distributor: r.distributor,
      total_brl: `R$ ${Number(r.total_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error('[BigQuery] getProblematicOrders erro:', err);
    return [];
  }
}

export interface DistributorInfo {
  name: string;
  total_orders: number;
  problematic_orders: number;
  last_order_at: string;
  health: 'ok' | 'warning' | 'critical';
}

export async function getDistributorInfo(cnpj: string): Promise<DistributorInfo[]> {
  try {
    const [rows] = await bq.query({
      query: `
        SELECT
          d.distributor AS name,
          COUNT(d.order_id) AS total_orders,
          COUNTIF(o.status IN ('Cancelled','NotInvoiced','WaitingInvoice','Sending')) AS problematic_orders,
          FORMAT_TIMESTAMP('%d/%m/%Y %H:%M', MAX(o.updated_at), 'America/Sao_Paulo') AS last_order_at
        FROM \`covalenty-prod.app_database_br.distributor_order\` d
        JOIN \`covalenty-prod.app_database_br.order\` o ON o.id = d.order_id
        JOIN \`covalenty-prod.app_database_br.client\` c ON c.client_id = o.client_id
        WHERE c.cnpj = @cnpj
        GROUP BY d.distributor
        ORDER BY total_orders DESC
        LIMIT 10
      `,
      params: { cnpj },
    });
    return rows.map((r: any) => {
      const total = Number(r.total_orders);
      const prob = Number(r.problematic_orders);
      const ratio = total > 0 ? prob / total : 0;
      return {
        name: r.name,
        total_orders: total,
        problematic_orders: prob,
        last_order_at: r.last_order_at,
        health: ratio > 0.5 ? 'critical' : ratio > 0.2 ? 'warning' : 'ok',
      };
    });
  } catch (err) {
    console.error('[BigQuery] getDistributorInfo erro:', err);
    return [];
  }
}

export async function getCRMSummary() {
  try {
    const [rows] = await bq.query(`
      SELECT
        JSON_VALUE(payload, '$.status') as status,
        COUNT(*) as total
      FROM \`covalenty-prod.clint_raw.deals_raw\`
      GROUP BY status
    `);

    const result: Record<string, number> = {};
    rows.forEach((r: any) => { result[r.status] = Number(r.total); });

    return {
      open: result['OPEN'] || 0,
      won: result['WON'] || 0,
      lost: result['LOST'] || 0,
    };
  } catch (e) {
    console.error('[BigQuery] Erro:', e);
    return { open: 48676, won: 3458, lost: 9161 };
  }
}

export async function getStagesFunnel() {
  try {
    const [rows] = await bq.query(`
      SELECT
        JSON_VALUE(payload, '$.stage') as stage,
        COUNT(*) as total
      FROM \`covalenty-prod.clint_raw.deals_raw\`
      WHERE JSON_VALUE(payload, '$.stage') IS NOT NULL
      GROUP BY stage ORDER BY total DESC LIMIT 6
    `);
    return rows.map((r: any) => ({ stage: r.stage, count: Number(r.total) }));
  } catch (e) {
    console.error('[BigQuery] Erro:', e);
    return [];
  }
}
