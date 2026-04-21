# Changelog - Fync Financial Dashboard

Todas as mudanças notable neste projeto serão documentadas neste arquivo.

## [1.6.0] - 2026-04-21
### Adicionado
- **Índices em Tempo Real:** O Hub do Investidor agora monitora e exibe as cotações ao vivo do Ibovespa, IFIX e Dólar diretamente da B3/Yahoo Finance.
- **Gráfico de Evolução Patrimonial:** Visualização em gráfico de área do crescimento do seu patrimônio investido nos últimos 12 meses.
- **Auto-Refresh:** Os dados de mercado são atualizados automaticamente a cada 5 minutos enquanto você navega pela área de investimentos.

## [v1.6.0.2] - 2026-04-21
### Fixes
- **Dashboard Stabilization:** Fixed a critical syntax error (`Unterminated JSX contents`) caused by a missing closing `</div>` tag for the root `dashboard-layout` container. The dashboard should now render correctly.

## [v1.6.0.1] - 2026-04-21
### Added
- **Investor Hub Enhancement:**
  - Adicionado ticker tape (fita cotação) no topo com índices de mercado reais.
  - Painel lateral dinâmico de notícias atualizadas sobre mercado financeiro.

## [1.5.5] - 2026-04-21
### Adicionado
- **Balão de Memorando:** Agora, ao passar o mouse sobre o título de uma transação que possui um memorando/descrição, um balão elegante aparece mostrando as notas salvas. Isso permite visualizar detalhes extras sem precisar abrir a edição.

## [1.5.4.1] - 2026-04-21
### Corrigido
- **Alinhamento de Tabela:** Corrigido erro visual onde as colunas da tabela de transações ficavam desalinhadas em relação aos cabeçalhos quando o modo de seleção múltipla estava desativado.

## [1.5.4] - 2026-04-21
### Adicionado
- **Inteligência Profunda (Deep AI):** O botão de refinamento agora possui uma segunda etapa opcional que utiliza a Inteligência Artificial do Gemini para pesquisar e identificar empresas complexas que não possuem padrões óbvios, garantindo que até registros obscuros sejam categorizados corretamente.
- **Base de Conhecimento Expandida:** Adicionado suporte nativo para Airbnb, HBO, Disney+, Paramount, Prime Video e diversos bancos brasileiros.

## [1.5.3] - 2026-04-21
### Adicionado
- **Mágica do Finn (Refinar):** Adicionado botão para recategorizar automaticamente transações existentes que estão marcadas como "Outros". O sistema utiliza o histórico e a base de conhecimento para sugerir categorias melhores com um clique.

## [1.5.2] - 2026-04-21
### Adicionado
- **Categorização Inteligente Local:** Implementada uma base de conhecimento local com palavras-chave comuns (iFood, Uber, Netflix, Amazon, etc.) para garantir a categorização correta mesmo sem histórico prévio ou resposta imediata da IA.

## [1.5.1] - 2026-04-21
### Adicionado
- **Controle de Seleção Múltipla:** Adicionado botão explícito para "Selecionar Tudo" e "Parar Seleção", facilitando o gerenciamento de transações em massa.
- **Toggle de IA no OFX:** Agora é possível desativar a categorização automática por Inteligência Artificial durante a importação de arquivos OFX através de um interruptor no modal de pré-visualização.

## [1.5.0] - 2026-04-21
### Adicionado
- **Persistência de Conversa:** O histórico do chat com o Finn agora é salvo automaticamente no navegador (`localStorage`). Você pode reiniciar a página sem perder suas perguntas e as respostas da IA.
- **Limpeza de Histórico:** Adicionada confirmação de segurança ao clicar em "Limpar histórico" para evitar exclusões acidentais.

## [1.4.9] - 2026-04-21
### Alterado
- **Estabilidade da IA (Canal Lite):** O modelo foi alterado para `gemini-flash-lite-latest`. Identificamos que as versões 1.5 foram descontinuadas ou renomeadas no ambiente v1beta de 2026. A versão Lite oferece maior disponibilidade e deve evitar os erros de "modelo não encontrado" e "alta demanda".

## [1.4.8.1] - 2026-04-21
### Corrigido
- **Compatibilidade da API:** Corrigido o identificador do modelo Gemini para `1.5-flash-latest`. A versão anterior sem o sufixo causou erro de "modelo não encontrado" na API v1beta.

## [1.4.8] - 2026-04-21
### Alterado
- **Estabilidade da IA:** Alterado o modelo de `flash-latest` para `1.5-flash`. O canal "latest" estava apresentando picos de alta demanda e instabilidade nos servidores da Google. A versão 1.5 é mais estável e deve reduzir os erros de conexão.

## [1.4.7] - 2026-04-21
### Corrigido
- **Mensagens Cortadas no Finn (Ajuste Crítico):** Aplicada uma correção definitiva no layout das bolhas de chat, forçando largura total nos containers e permitindo que o texto flua corretamente (wrapping) mesmo em telas menores ou janelas flutuantes. Removidas restrições de overflow que causavam o corte do texto.

## [1.4.6] - 2026-04-21
### Corrigido
- **Consciência de Tempo da IA:** O contexto fornecido à Inteligência Artificial Finn agora respeita o mês e os filtros de período definidos ativamente pelo usuário no Dashboard. Antes, o robô enxergava o resumo histórico de absolutamente todas as transações cadastradas no site, o que levava a respostas genéricas (por exemplo, analisar "32 reais em Outros" de toda a vida da conta ao invés de apenas focar no "mês atual" que estava na tela).

## [1.4.5] - 2026-04-21
### Corrigido
- **Mensagens Cortadas no Finn:** Corrigido o problema visual onde as respostas da Inteligência Artificial eram cortadas lateralmente na bolha de chat devido a falha no ajuste automático de texto (wrapping).

## [1.4.4] - 2026-04-21
### Corrigido
- **Acesso Limitado à IA:** Revertido o roteamento da Inteligência Artificial. A API do usuário na nuvem (Google Cloud) apresentava cota zero (Limit: 0) estrita para o modelo `2.0`, travando-o com o erro financeiro de excesso de cota. Retornamos para o canal dinâmico `flash-latest` (que opera legalmente dentro da cota gratuita original do projeto).

## [1.4.3] - 2026-04-21
### Corrigido
- **Inteligência Artificial Finn (Desempenho e API):** O modelo foi atualizado de forma nativa para o avançado `gemini-2.0-flash`. Anteriormente, a migração tentava apontar para "version": "1.6.0", que não existia mais nos catálogos da Google, e a versão experimental utilizada antes demorava tanto que parecia travar o aplicativo. Agora as respostas são entregues em milissegundos sem congelar a tela.

## [1.4.2] - 2026-04-21
### Corrigido
- **Inteligência Artificial Finn:** Corrigida a comunicação corrompida com os servidores e estabilizada a conversão de valores matemáticos do histórico do usuário. A IA agora responde normalmente às perguntas sem travar o chat.

## [1.4.1] - 2026-04-21
### Corrigido
- **Ícones de Categorias:** Corrigido o bug onde logotipos de lojas não encontrados geravam um quadrado branco incorreto na listagem de transações dentro da aba de Categorias. Agora utiliza adequadamente o fallback inteligente.

## [1.4.0] - 2026-04-21
### Adicionado
- **Transferências Rápidas:** Novo sistema para transferir saldo diretamente entre diferentes carteiras.
- **Gráfico de Donut Patrimonial:** Nova visualização gráfica na Aba de Carteiras representando a divisão de saldos correntes.
- **Drill-down Inteligente de Carteiras:** Expanda uma conta ou cartão específico para ver suas transações isoladas diretamente na aba em formato de lista interativa.

## [1.3.0] - 2026-04-16
### Adicionado
- **Dashboard Premium (Pierre-style):** Redesign completo da aba de transações, incluindo Hero Cards para resumo financeiro, barra de filtros inteligentes e design minimalista em glassmorphism.
- **Seletor de Datas Avançado:** Implementação de calendário duplo flutuante para seleção de intervalos no histórico de transações.

## [1.2.0] - 2026-04-15
### Adicionado
- **Inteligência de Importação:** Novo mecanismo de detecção de duplicatas no OFX baseado em Data, Título e Valor.
- **Rastreador de Parcelamentos Premium:** Redesign completo com Hero Cards, filtros por abas (Ativas/Finalizadas) e cronograma de pagamentos.
- **Assinaturas Redesenhadas:** Novo layout inspirado no padrão Fync com métricas de gasto mensal e projeção anual.
- **Branding Real:** Integração com API de logotipos para exibir marcas reais (Netflix, Sony, Airbnb, etc) nos lançamentos.
- **Sistema de Versões:** Implementação inicial deste changelog e exibição da versão na interface.

### Corrigido
- Bugs de alinhamento e flexbox nas telas de parcelamento e assinaturas.
- Problema com ícones ausentes (Pause/Play) que causavam travamentos na renderização.

## [1.1.0] - 2026-04-13
### Alterado
- **Navegação Superior:** Substituição da barra lateral por um menu de pílulas (tabs) no topo para ganhar espaço de visualização.
- **Consolidação do Dashboard:** Unificação das visualizações de transações e relatórios em componentes reutilizáveis.

## [1.0.0] - 2026-04-11
### Adicionado
- Lançamento inicial do Fync com controle de transações, integração com Supabase e autenticação Google.
- Visão geral com gráficos básicos de gastos por categoria.
