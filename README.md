# Pokebinder Digital

Sistema completo de gerenciamento de cartas de Pokémon TCG com backend NestJS e aplicativo mobile React Native.

## Estrutura do Projeto

```
tcg/
├── packages/
│   ├── api-server/          # Backend NestJS
│   └── mobile-app/          # App React Native + Expo
├── .env.example             # Variáveis de ambiente de exemplo
└── pnpm-workspace.yaml      # Configuração do monorepo
```

## Tecnologias

### Backend (api-server)
- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **JWT + Passport** - Autenticação
- **Stripe** - Pagamentos
- **Stream Chat** - Chat em tempo real
- **Firebase** - Storage e notificações
- **APIs Externas**: Pokémon TCG, JustTCG, RapidAPI, Roboflow

### Mobile (mobile-app)
- **React Native 0.81** + **Expo 54**
- **React Navigation** - Navegação
- **Zustand** - Gerenciamento de estado
- **React Query** - Cache e sincronização de dados
- **Axios** - Cliente HTTP

## Pré-requisitos

- **Node.js** 18+
- **pnpm** 10+
- **PostgreSQL** 14+
- **Expo CLI** (instalado globalmente)
- **Xcode** (para iOS - apenas macOS)
- **Android Studio** (para Android - opcional)

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/Adilsonjvr/tcg.git
cd tcg
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

```bash
# Copie o exemplo
cp .env.example packages/api-server/.env

# Edite o arquivo .env com suas credenciais
nano packages/api-server/.env
```

Variáveis obrigatórias:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pokebinder"
JWT_SECRET="seu-secret-aqui"
```

### 4. Configure o banco de dados

```bash
cd packages/api-server

# Execute as migrations
pnpm prisma migrate dev

# (Opcional) Seed do banco
pnpm prisma db seed
```

## Como Executar

### Backend (API Server)

```bash
cd packages/api-server

# Modo desenvolvimento (com hot-reload)
pnpm run start:dev

# Modo produção
pnpm run build
pnpm run start:prod
```

A API estará disponível em: `http://localhost:3000`

### Mobile App - 3 Opções

#### Opção 1: Navegador Web (RECOMENDADO para testes rápidos)

```bash
cd packages/mobile-app

# Iniciar no navegador
pnpm run web
```

Acesse: `http://localhost:8081`

**Vantagens:**
- Teste rápido sem precisar de celular ou emulador
- Hot reload instantâneo
- DevTools do navegador disponível

**Limitações:**
- Algumas APIs nativas não funcionam (câmera, GPS, etc.)
- Layout pode variar do mobile real

#### Opção 2: Simulador iOS (macOS apenas)

```bash
cd packages/mobile-app

# Iniciar no simulador iOS
pnpm run ios
```

Certifique-se de ter o Xcode instalado.

#### Opção 3: Emulador/Dispositivo Android

```bash
cd packages/mobile-app

# Iniciar no Android
pnpm run android
```

Para testar em dispositivo físico:
1. Instale o app **Expo Go** no celular
2. Execute `pnpm start`
3. Escaneie o QR code com a câmera (iOS) ou com o Expo Go (Android)

## Desenvolvimento

### Scripts Úteis

#### API Server
```bash
# Linting
pnpm run lint

# Testes
pnpm run test
pnpm run test:e2e
pnpm run test:cov

# Prisma Studio (GUI do banco)
pnpm prisma studio
```

#### Mobile App
```bash
# Limpar cache
expo start -c

# Build de produção
expo build:android
expo build:ios
```

## Deploy

### Backend (API Server)

#### Railway (Recomendado)
1. Acesse [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Adicione um PostgreSQL service
4. Configure as variáveis de ambiente
5. Deploy automático!

URL exemplo: `https://seu-app.railway.app`

#### Alternativas
- **Render**: render.com (free tier com cold starts)
- **Fly.io**: fly.io (ótimo para Node.js)
- **DigitalOcean**: digitalocean.com/app-platform

### Mobile App

#### Expo Application Services (EAS)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar
eas build:configure

# Build Android
eas build --platform android

# Build iOS (requer Apple Developer Account)
eas build --platform ios
```

**Distribuição:**
- **Desenvolvimento**: Expo Go
- **Beta Testing**: TestFlight (iOS) / Google Play Internal (Android)
- **Produção**: App Store / Google Play

## Funcionalidades

### Autenticação
- Registro e login de usuários
- Autenticação JWT
- Controle parental (link parent-child)

### Inventário
- Adicionar cartas manualmente
- Scan de cartas (Roboflow AI)
- Visualização agregada do inventário
- Preços em tempo real (APIs Pokémon TCG)

### Trading
- Propor trocas entre usuários
- Sistema de aprovação
- Chat em tempo real (Stream)

### Eventos
- Criar e participar de eventos TCG
- Dashboard do vendedor
- Quick sales

### Vendor
- Dashboard para vendedores
- Gerenciamento de estoque
- Integração com Stripe

## Estrutura de Dados (Prisma)

```prisma
model User {
  id           String        @id @default(uuid())
  email        String        @unique
  username     String        @unique
  passwordHash String
  role         UserRole
  inventory    InventoryItem[]
  trades       Trade[]
  events       Event[]
}

model InventoryItem {
  id          String   @id @default(uuid())
  cardId      String
  cardName    String
  quantity    Int
  condition   String
  user        User     @relation(...)
}
```

Ver schema completo em: [packages/api-server/prisma/schema.prisma](packages/api-server/prisma/schema.prisma)

## Variáveis de Ambiente

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="..."
PASSWORD_SALT_ROUNDS="12"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stream Chat
STREAM_APP_ID="..."
STREAM_API_KEY="..."
STREAM_API_SECRET="..."

# Firebase
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."

# APIs
POKEMONTCG_API_KEY="..."
JUSTTCG_API_KEY="..."
RAPIDAPI_KEY="..."
ROBOFLOW_API_KEY="..."
```

Ver exemplo completo: [.env.example](.env.example)

## Troubleshooting

### Erro: "Metro bundler not found"
```bash
cd packages/mobile-app
pnpm install
expo start -c
```

### Erro: "Cannot connect to database"
```bash
# Verifique se o PostgreSQL está rodando
pg_isready

# Verifique a string de conexão no .env
echo $DATABASE_URL
```

### Erro: "Peer dependency warnings"
```bash
# Reinstale dependências
rm -rf node_modules packages/*/node_modules
pnpm install
```

### Web não carrega / tela branca
```bash
# Limpe cache e reinstale
cd packages/mobile-app
rm -rf .expo node_modules
pnpm install
pnpm run web
```

## Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Add nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

## Licença

Este projeto é privado e não possui licença pública.

## Suporte

Para questões ou problemas, abra uma issue no GitHub:
https://github.com/Adilsonjvr/tcg/issues

---

Desenvolvido com React Native, NestJS e muito ☕
