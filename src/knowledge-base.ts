export const MANUAL_SOS = `
# Manual SOS do Suporte Cienty

## Erro: Distribuidoras com "Erro ao Conectar"

Possibilidades:
- Senha inválida (para as que conectamos via login: Panpharma, SantaCruz, Servimed, Drogacenter, Medicamental, Navarro, Solfarma)
- Distribuidora desatualizada
- Intermitência na conexão

### Como resolver:
Se aparecer "Não foi possível sincronizar os produtos", geralmente é resolvido atualizando as distribuidoras na plataforma.

Se não resolver atualizando, abrir chamado com o time de produto.

### Senha inválida:
O cliente ou representante provavelmente alterou a senha do portal eletrônico. A nova senha precisa ser colocada na plataforma.
- Orientar o cliente a passar a nova senha ou mostrar como fazer
- Se não tiver a senha, orientar a redefinir no portal eletrônico ou acessar via Anydesk para auxiliar

---

## Erro: Distribuidoras "sumiram" da cotação

Possibilidades:
- Cliente excluiu as distribuidoras por engano da cotação
- Distribuidora desatualizada

### Como resolver:
- Verificar pelo acesso do cliente se as distribuidoras estão ativadas
- Na aba de busca, checar o filtro de distribuidoras
- Se desativadas, reativá-las na aba de cotação
- Se nenhuma ação funcionar, abrir chamado com o time

---

## Erro: "Carrinho não encontrado. Entre em contato com o suporte."

Causa: Acontece quando o cliente usa o site em browsers/abas diferentes e limpa o carrinho em um deles.

Solução: Orientar o cliente a usar apenas um browser/aba por vez.

---

## Erro: Network Error (não consegue importar arquivos ou buscar itens)

Causa: Pode ser instabilidade de infraestrutura ou VPN ativa na máquina do cliente.

### Como validar:
1. Abrir DevTools do navegador
2. Verificar a parte de Console
3. Pesquisar algum item na plataforma
4. Verificar se existe alguma requisição com status "failed"
5. Se sim, verificar se o cliente possui VPN na máquina
6. Se tiver VPN, desabilitar e tentar novamente

Se não funcionar, abrir chamado com o time.

---

## Problema: Pedido em status "Aguardando" por muito tempo

Causa: Demora no retorno dos pedidos — o pedido fica em status "aguardando" por período prolongado.

### Como resolver:
- Verificar se a distribuidora do pedido está com status de conexão normal
- Se a distribuidora estiver com erro, resolver a conexão primeiro (ver seção "Erro ao Conectar")
- Se a distribuidora estiver ok, abrir chamado com o time de produto informando o número do pedido e a distribuidora

---

## Problema: Divergência de preços (PE mostra valor diferente da plataforma)

Causa: O portal eletrônico (PE) do distribuidor apresenta um valor para o item, mas a plataforma Cienty mostra outro valor.

### Como resolver:
Geralmente a distribuidora está desatualizada. Rodar um sync (sincronização) normaliza a situação.
- Orientar o cliente a atualizar a distribuidora na plataforma
- Após a atualização, os preços devem se igualar
- Se persistir, abrir chamado com o time

---

## Sobre a Cienty

A Cienty é uma plataforma gratuita para farmácias encontrarem os melhores preços e terem suporte de verdade. Temos mais de 3.000 farmácias cadastradas.

A plataforma permite:
- Cotação de produtos com múltiplos distribuidores
- Comparação de preços em tempo real
- Gestão de pedidos
- Conexão com distribuidores (Panpharma, SantaCruz, Servimed, Drogacenter, Medicamental, Navarro, Solfarma e outros)
`;
