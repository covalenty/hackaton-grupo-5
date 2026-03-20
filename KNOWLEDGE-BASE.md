# Base de Conhecimento — Suporte Cienty (CarlinhIA)

> Gerado automaticamente a partir de 1000 conversas reais do WhatsApp
> Processado por Claude · 20 de março de 2026
> **Uso interno — time de CS Cienty**

---

# Documento de Inteligência de Suporte — Cienty
**Versão:** 1.0 | **Base:** Análise de 10 lotes de conversas de suporte | **Uso:** Interno — Time de Customer Success

---

## Resumo Executivo

A Cienty opera como intermediária crítica entre farmácias e distribuidoras, e a grande maioria dos problemas reportados está concentrada em **falhas de integração com distribuidoras** (especialmente Solfarma e Servimed), **pedidos travados em transição de status** e **bloqueios cadastrais por documentação incompleta ou vencida**. O time de suporte demonstra boa capacidade de triagem e comunicação empática, mas opera de forma predominantemente reativa — resolvendo sintomas (ex.: reenvio manual de pedidos) sem investigar ou endereçar causas raiz sistematicamente. A experiência de UX da plataforma é um ponto de atrito emergente, especialmente em relação à performance, atualização de página e importação de planilhas. Há uma oportunidade clara de reduzir volume de tickets criando playbooks documentados para os problemas recorrentes, em especial os que envolvem Solfarma, Servimed e bloqueios de cadastro.

---

## Problemas Mais Frequentes (ranqueados por volume)

### 1. Falhas de integração / conectividade com distribuidoras

**Descrição:** A distribuidora aparece como desconectada, o pedido não é transmitido ou fica travado, ou há erros no retorno da integração. Afeta múltiplos CNPJs ao mesmo tempo em alguns casos.

**Como o cliente relata:**
> *"a servimed não ta conectando"*
> *"não consigo transmitir pedido pela solfarma"*
> *"Distribuidora Solfarma a 3 dias não está sendo enviado. Tem algum motivo?"*
> *"desconectou e não consigo mais conectar"*

**Solução padrão do time:**
1. Verificar status da conta/CNPJ do cliente na plataforma
2. Tentar atualização via botão "casinha" / refresh da distribuidora
3. Contatar distribuidora diretamente para verificar status
4. Se instabilidade confirmada: comunicar ao cliente com prazo estimado de normalização
5. Reenvio manual do pedido quando aplicável

**Lacuna atual:** Não há script padronizado. Cada atendente resolve de forma diferente, o que gera inconsistência no tempo de resolução.

---

### 2. Pedidos travados em status (enviando / aguardando / cancelado)

**Descrição:** Pedidos ficam presos em fases de transição sem progressão automática. Causas incluem instabilidades técnicas, processamento manual pela distribuidora ou falha no roteamento.

**Como o cliente relata:**
> *"o do CNPJ 60.497.849/0001-44 está com status de enviando"*
> *"Esse pedido ficou enviando desde ontem e não recebi"*
> *"tem um pedido de ontem com status de 'enviando', será que este pedido virá?"*
> *"fiz um pedido pela plataforma, consta como faturado mas ainda não chegou"*

**Solução padrão do time:**
1. Verificar status do pedido no backend
2. Oferecer reenvio manual: *"posso reenviar por aqui?"*
3. Informar ao cliente sobre expectativa de retorno: *"já deve retornar o status em breve"*
4. Nos casos de CD com processamento manual (ex.: Ultrafarma): esclarecer que o status não será atualizado automaticamente

**Lacuna atual:** O reenvio manual é a solução padrão, mas não há diagnóstico sistemático da causa. Pedidos cancelados sem justificativa não são investigados.

---

### 3. Bloqueios de cadastro por documentação (CRF, SIVISA, Alvará)

**Descrição:** Farmácias ficam impossibilitadas de operar com uma ou mais distribuidoras por documentação vencida, incorreta ou não enviada. O bloqueio pode afetar múltiplas distribuidoras simultaneamente.

**Como o cliente relata:**
> *"no Cienty está avisando que estamos bloqueados na JMF por conta de validade da licença regional"*
> *"Distribuidora Solfarma está me barrando por motivo de Alvará vencido, mas não está"*
> *"Só nesse CNPJ constam 05 distribuidoras bloqueadas no total: JMF / Morauky / Nova SD / Qualymed / Rio Pharma"*
> *"O problema é que meu pai tinha mandado o SIVISA errado"*

**Solução padrão do time:**
1. Confirmar com a distribuidora qual o motivo exato do bloqueio
2. Solicitar documentação atualizada ao cliente: *"pode me enviar o SIVISA e CRF?"*
3. Encaminhar documentação para a distribuidora
4. Informar prazo estimado: *"devem liberar em até 72 horas"*

**Lacuna atual:** Quando o cliente alega que o documento não está vencido (ex.: caso do Alvará), não há processo de contestação formal junto à distribuidora.

---

### 4. Problemas de performance e UX da plataforma

**Descrição:** Lentidão no carregamento, necessidade de dar refresh constante, falhas na atualização de itens no carrinho, erros em importação de planilhas.

**Como o cliente relata:**
> *"a experiência de UI/UX está horrível"*
> *"tem hora que buga, tem que ficar dando refresh toda hora, não tem fluidez"*
> *"O sistema está muito ruim pra ajustar as quantidades no carrinho"*
> *"Desde segunda-feira o meu está lento"*
> *"Tentei importar a planilha e não carregou"*

**Solução padrão do time:**
1. Sugerir abrir em outro navegador
2. Indicar botão de refresh/atualização na interface
3. Para planilhas: enviar modelo correto (apenas coluna EAN + coluna quantidade, sem formatação)
4. Escalar feedback para o time de produto

**Lacuna atual:** Sem SLA de resposta documentado para bugs de UX. Feedbacks são encaminhados ao produto sem follow-up estruturado ao cliente.

---

### 5. Cadastro de novas farmácias / novos CNPJs em distribuidoras

**Descrição:** Clientes precisam ser cadastrados em distribuidoras com as quais ainda não operam. O processo é manual, depende de documentação e de aprovação da distribuidora, e pode levar dias.

**Como o cliente relata:**
> *"tem empresa que não temos o contato"*
> *"Me tira uma dúvida, pra vcs incluírem um Novo CNPJ na Plataforma, o que precisa?"*
> *"enviou o cadastro pela plataforma no dia 21 de janeiro, porém ainda não foram concluídos"*
> *"SP Med já liberou meu cadastro"* (indicando aguardar outras)

**Solução padrão do time:**
1. Coletar documentação: CNPJ, nome fantasia, endereço com CEP, e-mail, CRF, SIVISA, telefone do comprador
2. Encaminhar para distribuidoras
3. Informar prazo: *"devem liberar em até 72 horas, aí vai conectar automaticamente na plataforma"*
4. Enviar link de ativação quando disponível (ex.: Medicamental)

**Lacuna atual:** Cadastros com mais de 30 dias sem conclusão não têm processo de cobrança proativa. O cliente do Lote 8 aguardava conclusão há mais de 1 mês.

---

### 6. Variação de preços / condições de pagamento inesperadas

**Descrição:** Clientes identificam preços diferentes dos esperados ou condições de pagamento incorretas (ex.: "a vista mínimo R$ 0,00").

**Como o cliente relata:**
> *"Atorvastatina Legrand 20mg: R$6,25 → R$7,49"*
> *"Só tinha a opção a vista mínimo 0.00"*
> *"está sem prazo definido a Solfarma"*

**Solução padrão do time:**
1. Confirmar variação com a distribuidora
2. Atualizar prazo de pagamento nas configurações
3. Comunicar ao cliente após ajuste

---

## Distribuidoras com Mais Problemas

### 🔴 Solfarma — Maior volume de incidentes

| Tipo de Problema | Frequência Observada |
|---|---|
| Falha de integração / pedido não transmitido | Alta |
| Pedidos não faturados por instabilidade técnica | Alta |
| Demora no retorno do pedido | Alta |
| Itens sem estoque | Média |
| Campo de pagamento incorreto | Baixa |

**Contexto:** A Solfarma foi citada em pelo menos 7 dos 10 lotes analisados. Houve uma intermitência documentada nos dias 16-18/03 que causou não faturamento de múltiplos pedidos. Clientes descrevem como *"sempre dá problema na Solfarma"*, indicando percepção de recorrência. Parte dos problemas é de responsabilidade da distribuidora (envio manual, demora no faturamento), mas a Cienty é quem recebe o impacto.

---

### 🔴 Servimed — Problemas recorrentes de conectividade

| Tipo de Problema | Frequência Observada |
|---|---|
| Erro ao conectar / integração offline | Alta |
| Recuperação de senha/acesso | Média |

**Contexto:** Citada em múltiplos lotes com o mesmo padrão: cliente não consegue conectar, suporte orienta a clicar na "casinha" e aguardar 10 minutos. A solução paliativa funciona pontualmente, mas não há resolução definitiva documentada. Possível problema de integração estrutural não investigado.

---

### 🟡 JMF — Bloqueios cadastrais

| Tipo de Problema | Frequência Observada |
|---|---|
| Bloqueio por CRF vencido | Alta |
| Títulos em aberto | Média |
| Pendências regulatórias | Média |

**Contexto:** JMF bloqueia farmácias com frequência por questões de compliance (CRF, licença regional). O suporte Cienty funciona como intermediário, mas não tem autonomia para resolver — depende do cliente atualizar os documentos e da distribuidora reativar o cadastro.

---

### 🟡 Divamed — Desconexão e indisponibilidade

| Tipo de Problema | Frequência Observada |
|---|---|
| Saída não autorizada de CNPJs | Baixa |
| Distribuidora offline/indisponível | Média |

**Contexto:** Aparece em lotes 7, 8 e 9 com o mesmo problema: distribuidora desconectada da plataforma sem motivo claro. Em um caso, o suporte mencionou estar em reunião com o time de TI, sugerindo problema de nível técnico mais profundo.

---

### 🟡 Andorinha — Pedidos travados sem diagnóstico

| Tipo de Problema | Frequência Observada |
|---|---|
| Pedidos travados sem motivo identificado | Média |
| Problemas técnicos em integração | Baixa |

**Contexto:** Citada especialmente no Lote 1 como distribuidora onde o suporte *"ainda não conseguiu identificar o que está travando"*. TI foi acionado, sem resolução registrada.

---

### 🟢 Medicamental / SPMed / Seed Farma — Atrasos em cadastro e faturamento

**Contexto:** Distribuidoras mais novas na plataforma, com processos de cadastro mais lentos (dependem de aprovação manual delas) e faturamento com atrasos ocasionais. Nada sistêmico, mas gera tickets de acompanhamento.

---

## Como os Clientes se Comunicam

### Nível de formalidade
**Baixo a muito baixo.** O canal predominante é WhatsApp, e os clientes usam linguagem coloquial de forma consistente:
- Abreviações: *"Td bem?", "blz", "obg", "tbm"*
- Expressões regionais: *"ta jóia", "show de bola", "valeu gato"*
- Emojis e risadas: *"kkk", "rs"*, 👍
- Erros de digitação frequentes (sem impacto na compreensão)

### Forma de descrever problemas
**Vaga e direta.** Os clientes raramente fornecem contexto técnico espontaneamente:
- Descrevem o sintoma, não a causa: *"não fatura"*, *"não vai"*, *"bugou"*
- Usam o status do sistema como referência: *"está em enviando"*, *"aparece cancelado"*
- Poucos detalham qual navegador, horário exato, sequência de ações

**Exceção:** Clientes com perfil mais técnico (possivelmente donos ou gerentes de redes) usam linguagem mais precisa: *"tem outra URI rodando dentro de um iframe"*, *"o CNPJ 60.497.849/0001-44 está com status de enviando"*.

### Nível de urgência típico
A maioria comunica urgência de forma **implícita**, através de:
- Repetição da mesma mensagem sem resposta
- Referências a prazos financeiros: *"o boleto vence amanhã"*
- Impacto no cliente final: *"o cliente já nos contatou várias vezes"*
- Histórico de tentativas: *"tentei ontem assim e não carregou"*

Urgência **explícita** aparece em casos com impacto financeiro direto ou prazos regulatórios: *"partir do dia 01/04 não consigo receber mercadoria com CNPJ antigo"*.

### Vocabulário específico do segmento
O time deve conhecer os seguintes termos que os clientes usam:
- **Esteira de faturamento** — processo de processamento de pedidos na distribuidora
- **Prazo** — condição de pagamento (ex.: 7 dias, 35 dias)
- **CRF / SIVISA / Alvará** — documentos regulatórios obrigatórios
- **CNPJ** — usado como identificador primário da loja (clientes têm múltiplos CNPJs)
- **EAN** — código de barras do produto
- **Cotação** — processo de busca e comparação de preços entre distribuidoras
- **Carrinho** — seleção de itens antes do envio do pedido

### Horários e padrões de contato
Não há dado de horário suficiente para estatística robusta, mas há evidências de contatos em:
- **Horário comercial estendido** (até ~20h, conforme menção a "instabilidade ontem próximo das 20h")
- **Urgência pós-fechamento** implícita em algumas mensagens
- **Segunda-feira**