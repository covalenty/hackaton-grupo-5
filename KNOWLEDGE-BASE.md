# Base de Conhecimento — Suporte Cienty (CarlinhIA)

> Extraído de: Manual SOS interno + 29.083 conversas WhatsApp + BigQuery produção · Março 2026
> Atualizado automaticamente pelo knowledge-builder ao iniciar o servidor

---

## 1. Distribuidora com "Erro ao Conectar"

**Volume:** Alto
**Distribuidoras afetadas:** Panpharma, Santa Cruz, Servimed, Drogacenter, Medicamental, Navarro, Solfarma

**Causas comuns:**
- Senha do portal eletrônico foi alterada pelo cliente ou representante
- Distribuidora desatualizada (precisa de sync)
- Intermitência de conexão temporária

**Resposta padrão:**
> "Vou verificar o que está acontecendo com a [distribuidora], só um momento... Parece que a senha do portal pode ter sido alterada. Você tem a senha atual do portal da [distribuidora]? Se não tiver, posso te orientar a redefinir."

**Resolução:**
1. Rodar sync na distribuidora
2. Se não resolver → verificar senha do portal eletrônico
3. Orientar o cliente a atualizar a senha na plataforma (ou acessar via Anydesk)
4. Se persistir → escalar para time de produto

---

## 2. Distribuidora "sumiu" da cotação

**Volume:** Frequente

**Causas comuns:**
- Cliente desativou a distribuidora por engano
- Filtro de distribuidoras foi alterado na aba de busca

**Resposta padrão:**
> "Deixa eu checar se as distribuidoras estão ativadas no seu acesso... Às vezes elas ficam escondidas por um filtro. Clica na cotação e veja se tem um filtro de distribuidoras ativado."

**Resolução:**
1. Verificar se distribuidoras estão ativadas (acessar pela conta do cliente)
2. Checar filtro de distribuidoras na aba de busca
3. Reativar na aba de cotação se estiver desativada
4. Se não resolver → abrir chamado no time

---

## 3. Pedido travado em "Aguardando" ou "Sending"

**Volume:** Critico — 52.000+ casos no BigQuery

| Distribuidora | WaitingInvoice | Sending |
|---|---|---|
| PanPharma | 8.766 | 4.217 |
| Santa Cruz | 7.858 | 4.018 |
| ProFarma | 7.055 | 5.322 |
| Solfarma | 6.961 | 3.457 |
| Drogacenter | 6.669 | 3.369 |
| Milfarma | 5.651 | 2.191 |
| Servimed | 3.951 | — |

**Resposta padrão:**
> "Vi aqui que seu pedido está travado na [distribuidora]. Isso acontece quando a distribuidora tem delay no faturamento. Vou disparar uma sincronização agora — espera uns 10 minutinhos que dá certo."

**Resolução:**
1. Confirmar CNPJ do cliente
2. Buscar pedidos problemáticos no BigQuery (ferramenta `get_problematic_orders`)
3. Rodar sync na distribuidora (`trigger_sync`)
4. Se não resolver em 10 min → escalar com: número do pedido + distribuidora + status

---

## 4. Pedido em "Aguardando Faturamento" — Andorinha e Maxifarma

**Observação real das conversas WhatsApp:**
- "a Andorinha ainda não conseguiu identificar o que está travando os pedidos no seu acesso do lado deles"
- "a Maxifarma ontem teve um problema na esteira de faturamento"

**Resposta padrão:**
> "Já entrei em contato com a [distribuidora] sobre o seu pedido. Estão verificando o que aconteceu na esteira de faturamento. Assim que tiver retorno te aviso."

**Resolução:** Escalar para time humano. Time contata a distribuidora diretamente.

---

## 5. Preço diferente do Portal Eletrônico (PE)

**Causa:** Distribuidora desatualizada na plataforma

**Resposta padrão:**
> "O preço diferente acontece quando a distribuidora está com a tabela desatualizada. Vou rodar uma sincronização para atualizar os preços — deve normalizar em alguns minutos."

**Resolução:**
1. Rodar sync na distribuidora
2. Aguardar (~5 min)
3. Se persistir → abrir chamado com número do produto e distribuidora

---

## 6. Erro de rede / Network Error

**Causa:** VPN ativa na máquina do cliente ou instabilidade de infraestrutura

**Resposta padrão:**
> "Você está usando VPN no seu computador agora? Esse erro acontece quando tem VPN ativa. Se tiver, desativa e tenta de novo."

**Resolução:**
1. Orientar a desativar VPN
2. Se não resolver → DevTools > Console > verificar requisição com status "failed"
3. Abrir chamado com print do erro

---

## 7. Erro "Carrinho não encontrado"

**Causa:** Cliente usou a plataforma em browsers ou abas diferentes simultaneamente

**Resposta padrão:**
> "Esse erro acontece quando você usou o site em mais de uma aba ou navegador ao mesmo tempo. Pode fechar todas as abas e abrir em uma só?"

---

## Distribuidoras que precisam de senha do portal eletrônico

| Distribuidora | Precisa de senha manual |
|---|---|
| Panpharma | Sim |
| Santa Cruz | Sim |
| Servimed | Sim |
| Drogacenter | Sim |
| Medicamental | Sim |
| Navarro | Sim |
| Solfarma | Sim |

---

## Quando escalar para humano (N2/N3)

- Pedido travado há mais de 24h após sync
- Distribuidora com erro persistente mesmo após atualização de senha
- Cliente mencionar perda financeira ou urgência crítica
- Problema afeta múltiplos pedidos do mesmo cliente
- Andorinha ou Maxifarma com pedidos travados (precisam de contato direto)

---

## Padrões de linguagem dos clientes (WhatsApp real)

Os farmacêuticos são diretos e informais:
- "Problema na servimed"
- "voce consegue ver pra mim oq houve aqui?"
- "eles sao pessimo" (sobre distribuidoras)
- Mandam CNPJ ou email diretamente sem contexto adicional
- Muito gratos quando resolvido rápido ("obrigadoooooo", "muito obrigadaa")

**Conclusão:** Respostas devem ser curtas, com ação imediata, sem rodeios.

---

## Fluxo de atendimento CarlinhIA (N1 → N2 → N3)

```
Cliente contacta via Widget ou WhatsApp
        ↓
[N1] CarlinhIA (IA) resolve automaticamente
   - Consulta BigQuery (pedidos, distribuidoras)
   - Roda sync
   - Responde dúvidas da base de conhecimento
        ↓ (se não resolver)
[N2] Carla Feitosa assume pelo painel admin
   - Vê histórico completo
   - Responde em modo humano (aparece no widget em tempo real)
        ↓ (se precisar de tech)
[N3] Escalação automática via Slack #feedbacks
   - CarlinhIA posta resumo completo: CNPJ + problema + o que foi tentado
   - Time técnico assume
```

---

## CNPJs de teste com pedidos problemáticos reais (BigQuery)

| CNPJ | Pedidos problemáticos |
|---|---|
| `47.350.042/0001-16` | 528 — **usar na demo** |
| `18.454.563/0001-15` | 426 — backup |
| `44.623.074/0001-50` | 145 — teste rápido |

---

## Links do sistema

| | URL |
|---|---|
| Demo com widget | `https://cienty-agent-r5jlw7wilq-rj.a.run.app/widget-demo.html` |
| Painel admin | `https://cienty-agent-r5jlw7wilq-rj.a.run.app` |
| Widget standalone | `https://cienty-agent-r5jlw7wilq-rj.a.run.app/cliente.html` |
| Pitch | `https://cienty-agent-r5jlw7wilq-rj.a.run.app/pitch.html` |
| GitHub | `https://github.com/covalenty/hackaton-grupo-5` |
