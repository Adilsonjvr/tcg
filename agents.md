# `agents.md`: Plano de Execução do PokéBinder Digital

Este documento detalha o plano de execução faseado para uma equipa de agentes de IA construir o projeto PokéBinder Digital.

## 1. Definição dos Agentes

Definimos quatro agentes especializados para este projeto:

1.  **Agente de Infra & DB (Prisma):**
    * **Responsabilidade:** Configurar a infraestrutura do projeto (monorepo, `.env`) e gerir o "estado" da base de dados.
    * **Função:** Executar o `schema.prisma`, gerar migrações e garantir que a base de dados esteja sempre sincronizada com o esquema.

2.  **Agente de Back-end (NestJS):**
    * **Responsabilidade:** Construir o cérebro da aplicação.
    * **Função:** Escrever a lógica de negócios, criar os módulos do NestJS, os controllers (endpoints da API) e os serviços que implementam os requisitos do PRD.

3.  **Agente de Integração (APIs Externas):**
    * **Responsabilidade:** Lidar com todas as comunicações de terceiros.
    * **Função:** Escrever os "serviços de cliente" (SDKs) para o `api-services` (JustTCG, Roboflow, Stripe, Stream) e configurar os webhooks de entrada (ex: Stripe KYC).

4.  **Agente de Front-end (React Native):**
    * **Responsabilidade:** Construir a interface do utilizador no Expo (React Native).
    * **Função:** Criar as telas, a navegação, gerir o estado (React Query) e ligar os botões e formulários aos endpoints criados pelo Agente de Back-end.

---

## 2. Plano de Execução Faseado

A execução é dividida em fases. Nenhuma fase começa até que a anterior esteja funcional.

### Fase 0: Setup e "Sprint Zero"

* **Objetivo:** Preparar o ambiente de desenvolvimento e a estrutura do monorepo.
* **Agente de Infra & DB:**
    1.  Criar a estrutura de pastas do monorepo (ex: `/packages/api-server`, `/packages/mobile-app`).
    2.  Inicializar `pnpm` (ou `yarn`) na raiz.
    3.  Criar o ficheiro `schema.prisma` (v1.5) dentro de `/packages/api-server/prisma`.
    4.  Gerar a migração inicial (`prisma migrate dev`) para criar o esquema na base de dados PostgreSQL.
* **Agente de Back-end:**
    1.  Inicializar a aplicação NestJS em `/packages/api-server`.
    2.  Instalar o `PrismaClient`.
    3.  Gerar (via `nest g module/service/controller`) os "esqueletos" de todos os módulos principais: `Auth`, `Users`, `Parental`, `Inventory`, `Events`, `Trading`, `Vendor`.
* **Agente de Front-end:**
    1.  Inicializar a aplicação Expo (React Native, TypeScript) em `/packages/mobile-app`.
    2.  Instalar dependências: `react-navigation`, `axios`, `@tanstack/react-query`, `zustand` (para gestão de estado do token).
* **Agente de Integração:**
    1.  Criar o ficheiro `.env.example` na raiz com *todos* os placeholders de chaves de API (JustTCG, RapidAPI, Roboflow, Stripe, Stream, Firebase).

### Fase 1: Fundação (Autenticação e Controlo Parental)

* **Objetivo:** Implementar o Épico 6. O sistema tem de saber *quem* é o utilizador e *se* é menor, antes de qualquer outra ação.
* **Agente de Back-end:**
    1.  **Módulo `Auth`:**
        * Implementar `POST /auth/register` (RF 6.1). Lógica: receber `email`, `password`, `nome`, `nascimento`. Calcular a idade. Se for menor, criar `User` com `responsavelId` por preencher (pendente).
        * Implementar `POST /auth/login`. Lógica: validar com `bcrypt`, gerar e retornar um **JWT** (contendo `userId` e `role`).
    2.  **Módulo `Parental`:**
        * Implementar `POST /parental/link-account` (endpoint protegido por JWT). Lógica: O Responsável (já logado) envia um código único da conta do Menor. O sistema liga as duas contas (define o `responsavelId` no Menor).
* **Agente de Integração:**
    1.  Implementar `StripeService`. Criar função `createVerificationSession`.
    2.  **Módulo `Users` (Back-end):** Criar `POST /users/me/start-kyc` (RF 6.1). Lógica: Chamar `StripeService` para gerar um link de verificação para o Responsável/Vendedor.
    3.  **Módulo `Auth` (Back-end):** Criar `POST /webhooks/stripe`. Lógica: Receber o evento do Stripe e atualizar `User.isKycVerified = true`.
* **Agente de Front-end:**
    1.  Criar o `AuthNavigator` (stack de navegação).
    2.  Criar `LoginScreen` e `RegisterScreen`.
    3.  Criar o `AuthContext` (ou `Zustand store`) para armazenar o JWT.
    4.  Configurar o `axios` para enviar o JWT em todos os pedidos.
    5.  Implementar o fluxo de "Aguardando Verificação Parental" (para o Menor) e o `LinkParentScreen` (para o Responsável).

### Fase 2: O Coração (Inventário e Cartas)

* **Objetivo:** Implementar o Épico 1. Permitir que os utilizadores (Adultos e Menores) adicionem cartas ao seu inventário.
* **Agente de Integração:**
    1.  Implementar `JustTcgService` (para `GET /price-history`).
    2.  Implementar `RapidApiService` (para `GET /card-definition`).
    3.  Implementar `RoboflowService` (para `POST /scan-image`).
* **Agente de Back-end:**
    1.  **Módulo `Inventory`:**
        * Criar `GET /cards/search?name=...`. Lógica: Chamar `RapidApiService`.
        * Criar `GET /cards/:id/history`. Lógica: Chamar `JustTcgService`.
        * Criar `POST /inventory` (Adição Manual, RF 1.2). Lógica: Receber `cardDefinitionId`, `condition`, `language`, etc. Criar o `InventoryItem` ligado ao `ownerId` (do JWT).
        * Criar `GET /inventory/me`. Lógica: Retornar a lista de `InventoryItem`s do utilizador logado.
        * Criar `PUT /inventory/:id`. Lógica: Atualizar `visibilidade` (RF 1.5) ou `precoVenda`. Garantir que o `ownerId` do item é igual ao `userId` do JWT.
    2.  **Módulo `Inventory` (IA Scan):**
        * Criar `POST /inventory/scan` (RF 1.1). Lógica: Receber a imagem, enviar para `RoboflowService`, retornar uma lista de `CardDefinition`s correspondentes.
* **Agente de Front-end:**
    1.  Criar o `AppNavigator` (com Bottom Tabs: "Inventário", "Eventos", "Trocas", "Perfil").
    2.  Criar `MyInventoryScreen` (RF 1.4). Usar `React Query` para `GET /inventory/me`.
    3.  Criar `ItemDetailScreen` (RF 1.6). Mostrar dados e o gráfico de histórico de preços.
    4.  Criar `AddCardScreen`. Implementar o formulário de Adição Manual.
    5.  Integrar `expo-camera` e `expo-image-picker` no `AddCardScreen`. Ao tirar foto, enviar para `POST /inventory/scan` e exibir os resultados para o utilizador confirmar.

### Fase 3: A Comunidade (Eventos)

* **Objetivo:** Implementar o Épico 2 e 3. Dar vida aos eventos presenciais.
* **Agente de Back-end:**
    1.  **Módulo `Events`:**
        * Criar `POST /events` (RF 2.1). Lógica: Verificar se `user.isKycVerified = true` (Vendedor ou Host).
        * Criar `GET /events/validated` (RF 2.2).
        * Criar `POST /events/:id/confirm-presence` (RF 2.3).
            * **Lógica de Controlo Parental:** Se `user` for Menor, criar `EventParticipation` com `status = PENDING_APROVACAO_PARENTAL`.
            * **Ação (Integração):** Chamar `FirebaseAdminService` para enviar notificação push ao Responsável.
            * **Lógica Adulto:** Se Adulto, definir `status = CONFIRMAD`.
        * Criar `GET /events/:id/aggregated-inventory` (RF 2.6). Lógica: Consulta complexa no Prisma para encontrar todos os `InventoryItem`s (com `visibilidade != PESSOAL`) de todos os utilizadores com `EventParticipation.status = CONFIRMADO` para este evento.
* **Agente de Front-end:**
    1.  Criar `EventListScreen`.
    2.  Criar `EventDetailScreen`. Implementar o botão "Confirmar Presença" (RF 2.3) e exibir o aviso de segurança.
    3.  Criar `AggregatedInventoryScreen` (RF 2.6). Implementar a UI de filtros avançados e a lista de cartas. Ao clicar numa carta, mostrar a quem pertence.

### Fase 4: A Ação (Trocas, Ofertas e Chat)

* **Objetivo:** Implementar o Épico 4. O núcleo da interação presencial.
* **Agente de Back-end:**
    1.  **Módulo `Trading`:**
        * Criar `POST /trades/propose` (RF 4.1, 4.2). Este é o endpoint mais complexo.
            * *Payload:* `{ recetorId: string, proponentItemIds: string[], recetorItemIds: string[], proponenteDinheiro?: number }`.
            * *Validação 1:* O `recetorId` e o `proponenteId` (do JWT) estão ambos confirmados no mesmo evento?
            * *Validação 2 (RF 6.5):* O `proponente` é Menor E (`proponenteDinheiro > 0` OU `recetorDinheiro > 0`)? Se sim, REJEITAR.
            * *Validação 3 (RF 4.1.e):* A diferença de valor (chamada ao `JustTcgService`) está dentro do limite de 15%?
            * *Ação 1:* Criar o `Trade` e os `TradeItem`s.
            * *Ação 2:* Definir o `status` do `Trade` (se Menor envolvido, `PENDENTE_APROVACAO_PARENTAL`; senão, `PENDENTE_UTILIZADOR`).
            * *Ação 3:* Atualizar o `status` de todos os `InventoryItem`s para `EM_PROPOSTA` (para bloqueá-los).
        * Criar `POST /trades/:id/accept`. Lógica: Mudar `Trade.status` para `ACEITE`.
        * Criar `POST /trades/:id/confirm-handshake` (RF 4.1.g). Lógica: Endpoint complexo que regista quem confirmou. Quando o *segundo* utilizador confirma, o serviço deve **trocar os `ownerId`** dos `InventoryItem`s envolvidos e definir `Trade.status = CONCLUIDA`.
* **Agente de Integração:**
    1.  Implementar `StreamChatService`.
    2.  **Módulo `Trading` (Back-end):** Modificar `POST /trades/:id/accept`. Na lógica de sucesso, chamar `StreamChatService.createChannel` (RF 4.3) e ligar o ID do chat ao `Trade`.
* **Agente de Front-end:**
    1.  Criar `TradeProposalScreen`. UI para selecionar cartas do `AggregatedInventory` (RF 2.6) e do seu próprio inventário.
    2.  Criar `TradeDetailScreen`. Mostrar os itens, o status.
    3.  **Integração do Chat (RF 4.3):** No `TradeDetailScreen`, se `trade.status === 'ACEITE'`, inicializar o SDK do Stream Chat e carregar o canal de chat específico daquela troca.

### Fase 5: Valor Agregado (Dashboards e UI Parental)

* **Objetivo:** Implementar o Épico 5 (Vendedor) e a UI do Épico 6 (Responsável).
* **Agente de Back-end:**
    1.  **Módulo `Vendor`:**
        * Criar `POST /vendor/quick-sale` (RF 5.1). Lógica: Criar `SaleRecord`, definir `InventoryItem.status = VENDIDO`.
        * Criar `GET /vendor/dashboard` (RF 5.2). Lógica: Agregação complexa de `SaleRecord`s e `Trade`s concluídos para gerar estatísticas.
    2.  **Módulo `Parental`:**
        * Criar `GET /parental/dashboard` (RF 6.2). Lógica: Retornar o perfil do Menor, inventário, e listas de `Trade`s e `EventParticipation` com `status = PENDING_APROVACAO_PARENTAL`.
        * Criar `POST /parental/approve/trade/:tradeId` (RF 6.3).
        * Criar `POST /parental/approve/event/:eventId` (RF 6.4).
        * Criar `GET /parental/chat/:chatId` (RF 6.6). Lógica: Aceder ao chat do Menor (requer lógica especial no `StreamChatService`).
* **Agente de Front-end:**
    1.  Criar o `VendorDashboardScreen` (RF 5.2). (Apenas visível se `user.role === 'VENDEDOR'`).
    2.  Criar o `ParentalDashboardScreen` (RF 6.2). (Apenas visível se `user.role === 'RESPONSAVEL'`).
    3.  Criar `ApprovalQueueScreen` (RF 6.3, 6.4) no Dashboard Parental, com botões de "Aprovar" / "Rejeitar" que chamam os endpoints do `ParentalModule`.

### Fase 6: Finalização

* **Agente de Infra & DB:** Rever todos os índices da base de dados para otimizar as consultas (especialmente RF 2.6 e RF 5.2).
* **Todos os Agentes:** Executar testes de integração completos, focando-se nos fluxos de Controlo Parental e na transferência de propriedade dos `InventoryItem`s.