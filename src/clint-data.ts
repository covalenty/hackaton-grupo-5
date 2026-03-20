import fs from 'fs';
import path from 'path';

const CONTACTS_FILE = path.join(__dirname, '../data/contacts.json');
const DEALS_FILE = path.join(__dirname, '../data/deals.json');

interface RawContact {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  organization?: {
    name?: string | null;
    fields?: Record<string, any>;
  };
  fields?: Record<string, any>;
}

interface RawDeal {
  id: string;
  contact: { id: string; name: string; phone?: string | null };
  stage: string;
  status: string;
  created_at: string;
  updated_at: string;
  user: { full_name: string; email: string } | null;
}

// Stage → readable last message preview
function stageToPreview(stage: string, days: string | undefined): string {
  if (days !== undefined) {
    const d = parseInt(days, 10);
    if (d === 0) return 'Pedido feito hoje';
    if (d === 1) return 'Último pedido ontem';
    if (d > 0) return `Sem pedidos há ${d} dias`;
  }
  const map: Record<string, string> = {
    'Base': 'Cliente ativo na base',
    'Base SDR': 'Em prospecção SDR',
    '< 7 dias pedidos': 'Pedido recente (< 7 dias)',
    '> 15 dias sem pedidos': 'Sem pedidos há mais de 15 dias',
    'Churned': 'Cliente churnado',
    'Potencial churn': 'Risco de churn identificado',
  };
  return map[stage] || stage || 'Sem atividade recente';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getConversations(search?: string) {
  let contacts: RawContact[] = [];
  try {
    contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
  } catch {
    return [];
  }

  // Only keep contacts with CNPJ (real pharmacy clients)
  const withCnpj = contacts.filter(c => {
    const cnpj = c.fields?.cnpj || c.organization?.fields?.cnpj;
    return !!cnpj;
  });

  // Apply search filter
  const filtered = search
    ? withCnpj.filter(c => {
        const cnpj = (c.fields?.cnpj || c.organization?.fields?.cnpj || '').toLowerCase();
        const name = (c.fields?.nome_fantasia || c.fields?.razao_social || c.name || '').toLowerCase();
        const q = search.toLowerCase();
        return cnpj.includes(q) || name.includes(q);
      })
    : withCnpj;

  // Sort by updated_at desc, take top 50
  const sorted = filtered
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 50);

  return sorted.map(c => {
    const cnpj = c.fields?.cnpj || c.organization?.fields?.cnpj || '';
    const name = c.fields?.nome_fantasia || c.organization?.fields?.name?.split(' - ')[0] || c.name;
    const days = c.fields?.dias_desde_ultimo_pe;
    const stage = days !== undefined
      ? (parseInt(days, 10) === 0 ? '< 7 dias pedidos' : parseInt(days, 10) > 15 ? '> 15 dias sem pedidos' : 'Base')
      : 'Base';
    const gmv = c.fields?.gmv_ultimo_mes ? `R$${parseFloat(c.fields.gmv_ultimo_mes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;
    const totalOrders = c.fields?._pedidos_total || null;
    return {
      id: c.id,
      name: name || 'Sem nome',
      cnpj,
      phone: c.phone || '',
      preview: stageToPreview(stage, days),
      time: formatDate(c.updated_at),
      stage,
      gmv,
      totalOrders,
      city: c.fields?.cidade || c.organization?.fields?.city || '',
      state: c.fields?.estado || c.organization?.fields?.state || '',
    };
  });
}
