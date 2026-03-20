# Base de Conhecimento — Suporte Cienty

> Extraído de: Manual SOS interno + 29.083 conversas WhatsApp + BigQuery produção · Março 2026

---

## 1. Distribuidora com "Erro ao Conectar"

**Volume:** Alto · aparece nas distribuidoras com login via portal eletrônico
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
3. Orientar cliente a atualizar a senha na plataforma (ou acessar via Anydesk)
4. Se persistir → escalar para time de produto

---

## 2. Distribuidora "sumiu" da cotação

**Volume:** Frequente · especialmente após limpeza de filtros pelo cliente

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

**Volume:** Critico — 52.000+ casos no BigQuery (WaitingInvoice + Sending)
**Top distribuidoras:** PanPharma (8.766), Santa Cruz (7.858), ProFarma (7.055), Solfarma (6.961), Drogacenter (6.669)

**Resposta padrão:**
> "Vi aqui que seu pedido está travado na [distribuidora]. Isso acontece quando a distribuidora tem delay no faturamento. Vou disparar uma sincronização agora — espera uns 10 minutinhos que dá certo."

**Resolução:**
1. Confirmar CNPJ do cliente
2. Buscar pedidos problemáticos no BigQuery
3. Rodar sync na distribuidora
4. Se não resolver em 10 min → escalar informando: número do pedido + distribuidora + status

---

## 4. Pedido em "Aguardando Faturamento" — Andorinha e Maxifarma

**Observação real das conversas WhatsApp:**
- "a Andorinha ainda não conseguiu identificar o que está travando os pedidos no seu acesso do lado deles"
- "a Maxifarma ontem teve um problema na esteira de faturamento"

**Resposta padrão:**
> "Já entrei em contato com a [distribuidora] sobre o seu pedido. Estão verificando o que aconteceu na esteira de faturamento. Assim que tiver retorno te aviso."

**Resolução:** Escalar para time humano com contexto completo. Time contata a distribuidora diretamente.

---

## 5. Preço diferente do Portal Eletrônico (PE)

**Causa:** Distribuidora desatualizada na plataforma

**Resposta padrão:**
> "O preço diferente acontece quando a distribuidora está com a tabela desatualizada. Vou rodar uma sincronização para atualizar os preços — deve normalizar em alguns minutos."

**Resolução:**
1. Rodar sync na distribuidora
2. Aguardar sincronização (~5 min)
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

## Distribuidoras que precisam de login manual (senha do portal)

| Distribuidora | Precisa de senha do portal eletrônico |
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

- Pedido travado ha mais de 24h apos sync
- Distribuidora com erro persistente mesmo apos atualização de senha
- Cliente mencionar perda financeira ou urgencia critica
- Problema afeta multiplos pedidos do mesmo cliente
- Andorinha ou Maxifarma com pedidos travados (precisam de contato direto com a distribuidora)

---

## Padroes de linguagem dos clientes (WhatsApp)

Os farmaceuticos costumam ser diretos e informais:
- "Problema na servimed"
- "voce consegue ver pra mim oq houve aqui?"
- "eles sao pessimo" (sobre distribuidoras)
- Mandam CNPJ ou email diretamente sem contexto
- Muito gratos quando resolvido rapido ("obrigadoooooo", "muito obrigadaa")

Isso indica que respostas devem ser curtas, diretas e com acao imediata — sem rodeios.

---

## CNPJs de teste (reais, com pedidos problematicos no BigQuery)

| CNPJ | Pedidos problematicos |
|---|---|
| `47.350.042/0001-16` | 528 |
| `18.454.563/0001-15` | 426 |
| `44.623.074/0001-50` | 145 |
