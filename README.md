# Nails Agenda — API

Backend de agendamento para nail designer: página pública de agendamento,
cobrança de **sinal via Pix (PagBank)** e painel administrativo.

**Stack:** Node.js + TypeScript + Fastify + Prisma + MySQL 8 + PagBank (Orders API / Pix).

---

## 1. Pré-requisitos

- Node.js 18.17+ (testado no 22)
- MySQL 8 (o do WAMP serve) **rodando** em `localhost:3306`
- Uma conta PagBank com **token de API** (sandbox para testar)

---

## 2. Configuração

```bash
cp .env.example .env
```

Edite o `.env`:

- `DATABASE_URL` / `DB_*` — acesso ao MySQL do WAMP (padrão: `root` sem senha).
- `JWT_SECRET` — troque por uma chave grande e aleatória.
- `PAGBANK_TOKEN` — seu token do PagBank.
- `PAGBANK_BASE_URL` — `https://sandbox.api.pagseguro.com` (teste) ou `https://api.pagbank.com` (produção).
- `PUBLIC_API_URL` — URL pública da API (para o webhook do PagBank). Em dev, use um túnel (ngrok/cloudflared).

---

## 3. Banco de dados (migrations)

**Inicie o MySQL do WAMP primeiro.** Depois:

```bash
npm install
npm run migrate
```

Isso cria o banco (se não existir) e aplica os arquivos de `migrations/` em ordem,
uma única vez cada (controle na tabela `_migrations`).

- `npm run migrate:status` — mostra o que já foi aplicado.
- As migrations são **SQL puro** em `migrations/` — você também pode colar direto
  no phpMyAdmin, na ordem `001 → 002 → 003 → 004`.

Migrations incluídas:

| Arquivo | Conteúdo |
| --- | --- |
| `001_init.sql` | negócios, usuários, profissionais, clientes, serviços, horários, bloqueios, **agendamentos**, **pagamentos**, log de webhooks |
| `002_whatsapp_notifications.sql` | sessão/auth do Baileys em SQL, templates e fila de mensagens |
| `003_financial.sql` | despesas, caixa e auditoria |
| `004_seed.sql` | negócio, horários e serviços de exemplo + templates de mensagem |

### Criar o admin do painel

O usuário admin não vem no seed (a senha precisa de hash). Rode:

```bash
npm run create-admin -- "Juliana" "juliana@email.com" "minhaSenha123"
```

---

## 4. Rodar a API

```bash
npm run dev      # desenvolvimento (reload automático)
npm start        # execução simples
```

Sobe em `http://localhost:3333`. Teste: `http://localhost:3333/health`.

> Use **`localhost`**, nunca `http://0.0.0.0:3333` — `0.0.0.0` é só o endereço
> que o servidor escuta, não abre no navegador.

## 4b. Rodar o frontend (layout)

O frontend fica na pasta [`web/`](web) (Next.js + Tailwind). Em outro terminal:

```bash
cd web
npm install      # só na primeira vez
npm run dev
```

Abra **`http://localhost:3000`** — página pública de agendamento.
O painel fica em **`http://localhost:3000/admin`** (login com o usuário criado
em `npm run create-admin`).

**Ordem para tudo funcionar:** MySQL do WAMP ligado → `npm run migrate` →
`npm run create-admin` → API (`npm run dev` na raiz) → web (`npm run dev` em `web/`).
Se a página mostrar "Failed to fetch", é porque a API/MySQL não estão no ar.

---

## 5. Fluxo da cliente (sem cadastro/login)

1. `GET /api/public/services` → lista de serviços e valor do sinal
2. `GET /api/public/availability?serviceId=1&date=2026-09-20` → horários livres
3. `POST /api/public/appointments` → cria a **reserva** (`pending_payment`, expira em `RESERVATION_MINUTES`)
4. `POST /api/public/payments/pix` `{ "token": "<token-do-agendamento>" }` → devolve o **Pix copia-e-cola** e a imagem do QR
5. Cliente paga → o **webhook do PagBank** confirma → agendamento vira `confirmed`
6. `GET /api/public/appointments/:token` → a cliente acompanha o status

> A confirmação **nunca** vem do navegador da cliente. O webhook
> (`POST /api/webhooks/pagbank`) recebe a notificação e o backend
> **consulta o próprio PagBank** (`GET /orders/{id}`) para validar o pagamento
> antes de confirmar — isso previne fraude.

---

## 6. Endpoints principais

### Público — `/api/public`
- `GET /services`
- `GET /availability?serviceId=&date=YYYY-MM-DD[&professionalId=]`
- `POST /appointments`
- `GET /appointments/:token`
- `POST /payments/pix`

### Autenticação — `/api/auth`
- `POST /login` → `{ token, user }`
- `GET /me`

### Admin — `/api/admin` (envie `Authorization: Bearer <token>`)
- `GET /dashboard`
- `GET/POST/PATCH/DELETE /services`
- `GET /clients`, `GET /clients/:id` (histórico)
- `GET/POST/PATCH /appointments` (criação manual já confirmada)
- `GET/PUT /business-hours`
- `GET/POST/DELETE /blocked-times`
- `GET /payments`

### Webhook — `/api/webhooks`
- `POST /pagbank` (configurar como `notification_url` no PagBank)

---

## 7. Testando o webhook em desenvolvimento

O PagBank precisa alcançar sua API. Em dev:

```bash
# exemplo com cloudflared
cloudflared tunnel --url http://localhost:3333
```

Coloque a URL pública gerada em `PUBLIC_API_URL` no `.env` e reinicie a API.

---

## 8. Próximos passos (fora deste MVP)

- Expiração automática das reservas não pagas (worker/cron marcando `expired`).
- Worker BullMQ + Baileys consumindo `notification_jobs` (confirmação, lembrete 24h/2h).
- Frontend Next.js (página pública + painel).
- Relatórios financeiros e campanhas de retorno.

As tabelas para tudo isso já existem no schema.
