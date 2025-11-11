-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MENOR', 'RESPONSAVEL', 'ADULTO', 'VENDEDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "KycProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "InventoryVisibility" AS ENUM ('PESSOAL', 'EVENTO', 'PUBLICO');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('DISPONIVEL', 'EM_PROPOSTA', 'VENDIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "CardCondition" AS ENUM ('MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR');

-- CreateEnum
CREATE TYPE "CardLanguage" AS ENUM ('EN', 'PT', 'ES', 'FR', 'DE', 'IT', 'JA', 'KO', 'ZH', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('RASCUNHO', 'PENDENTE_VALIDACAO', 'VALIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EventParticipationStatus" AS ENUM ('PENDENTE_UTILIZADOR', 'PENDENTE_APROVACAO_PARENTAL', 'CONFIRMADO', 'REJEITADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDENTE_UTILIZADOR', 'PENDENTE_APROVACAO_PARENTAL', 'ACEITE', 'REJEITADO', 'CANCELADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TradeParticipantSide" AS ENUM ('PROPONENTE', 'RECETOR');

-- CreateEnum
CREATE TYPE "ParentalApprovalStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('JUST_TCG', 'RAPID_API', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nascimento" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL,
    "responsavelId" TEXT,
    "parentLinkCode" TEXT,
    "parentLinkCodeExpiresAt" TIMESTAMP(3),
    "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "stripeCustomerId" TEXT,
    "stripeVerificationSession" TEXT,
    "streamUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardDefinition" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "serie" TEXT,
    "setName" TEXT,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "rarity" TEXT,
    "supertype" TEXT,
    "subtypes" TEXT,
    "artist" TEXT,
    "smallImageUrl" TEXT,
    "largeImageUrl" TEXT,
    "cardMarketId" TEXT,
    "tcgPlayerProductId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cardDefinitionId" TEXT NOT NULL,
    "condition" "CardCondition" NOT NULL,
    "language" "CardLanguage" NOT NULL DEFAULT 'EN',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "visibility" "InventoryVisibility" NOT NULL DEFAULT 'PESSOAL',
    "status" "InventoryStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "aquisicaoFonte" TEXT,
    "precoCompra" DECIMAL(12,2),
    "precoVendaDesejado" DECIMAL(12,2),
    "valorEstimado" DECIMAL(12,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "hostId" TEXT NOT NULL,
    "venueName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDENTE_VALIDACAO',
    "capacidade" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventParticipationStatus" NOT NULL DEFAULT 'PENDENTE_UTILIZADOR',
    "parentalStatus" "ParentalApprovalStatus",
    "parentalDecidedById" TEXT,
    "parentalDecidedAt" TIMESTAMP(3),
    "parentalDecisionNote" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "proponenteId" TEXT NOT NULL,
    "recetorId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDENTE_UTILIZADOR',
    "proponenteDinheiro" DECIMAL(12,2),
    "recetorDinheiro" DECIMAL(12,2),
    "avaliacaoProponente" DECIMAL(12,2),
    "avaliacaoRecetor" DECIMAL(12,2),
    "diferencaValorAbsoluta" DECIMAL(12,2),
    "diferencaPercentual" DECIMAL(5,2),
    "chatChannelId" TEXT,
    "proponenteHandshakeAt" TIMESTAMP(3),
    "recetorHandshakeAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "side" "TradeParticipantSide" NOT NULL,
    "valuation" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeApproval" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "status" "ParentalApprovalStatus" NOT NULL DEFAULT 'PENDENTE',
    "decisionAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRecord" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "precoVenda" DECIMAL(12,2) NOT NULL,
    "vendidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compradorNome" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "KycProvider" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPriceSnapshot" (
    "id" TEXT NOT NULL,
    "cardDefinitionId" TEXT NOT NULL,
    "source" "PriceSource" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "low" DECIMAL(12,2),
    "mid" DECIMAL(12,2),
    "high" DECIMAL(12,2),
    "market" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_parentLinkCode_key" ON "User"("parentLinkCode");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_responsavelId_idx" ON "User"("responsavelId");

-- CreateIndex
CREATE INDEX "CardDefinition_nome_idx" ON "CardDefinition"("nome");

-- CreateIndex
CREATE INDEX "CardDefinition_setCode_collectorNumber_idx" ON "CardDefinition"("setCode", "collectorNumber");

-- CreateIndex
CREATE INDEX "InventoryItem_ownerId_idx" ON "InventoryItem"("ownerId");

-- CreateIndex
CREATE INDEX "InventoryItem_cardDefinitionId_idx" ON "InventoryItem"("cardDefinitionId");

-- CreateIndex
CREATE INDEX "InventoryItem_status_visibility_idx" ON "InventoryItem"("status", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startAt_idx" ON "Event"("status", "startAt");

-- CreateIndex
CREATE INDEX "EventParticipation_status_idx" ON "EventParticipation"("status");

-- CreateIndex
CREATE INDEX "EventParticipation_parentalStatus_idx" ON "EventParticipation"("parentalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipation_eventId_userId_key" ON "EventParticipation"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Trade_eventId_idx" ON "Trade"("eventId");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "Trade_proponenteId_idx" ON "Trade"("proponenteId");

-- CreateIndex
CREATE INDEX "Trade_recetorId_idx" ON "Trade"("recetorId");

-- CreateIndex
CREATE INDEX "TradeItem_inventoryItemId_idx" ON "TradeItem"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeItem_tradeId_inventoryItemId_key" ON "TradeItem"("tradeId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "TradeApproval_status_idx" ON "TradeApproval"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TradeApproval_tradeId_responsavelId_key" ON "TradeApproval"("tradeId", "responsavelId");

-- CreateIndex
CREATE INDEX "SaleRecord_vendorId_idx" ON "SaleRecord"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleRecord_inventoryItemId_key" ON "SaleRecord"("inventoryItemId");

-- CreateIndex
CREATE INDEX "KycVerification_userId_status_idx" ON "KycVerification"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KycVerification_provider_sessionId_key" ON "KycVerification"("provider", "sessionId");

-- CreateIndex
CREATE INDEX "CardPriceSnapshot_cardDefinitionId_source_idx" ON "CardPriceSnapshot"("cardDefinitionId", "source");

-- CreateIndex
CREATE INDEX "CardPriceSnapshot_createdAt_idx" ON "CardPriceSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cardDefinitionId_fkey" FOREIGN KEY ("cardDefinitionId") REFERENCES "CardDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_parentalDecidedById_fkey" FOREIGN KEY ("parentalDecidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_proponenteId_fkey" FOREIGN KEY ("proponenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_recetorId_fkey" FOREIGN KEY ("recetorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeApproval" ADD CONSTRAINT "TradeApproval_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeApproval" ADD CONSTRAINT "TradeApproval_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPriceSnapshot" ADD CONSTRAINT "CardPriceSnapshot_cardDefinitionId_fkey" FOREIGN KEY ("cardDefinitionId") REFERENCES "CardDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

