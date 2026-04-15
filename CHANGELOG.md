# Changelog - Fync Financial Dashboard

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

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
