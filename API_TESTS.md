# 🧪 Testes da API - Studio Flora

## 🌐 Base URL
```
Produção: https://studioflora.site
Local: http://localhost:3007
```

---

## ✅ 1. Health Check

```bash
curl https://studioflora.site/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "ts": "2024-09-17T12:00:00.000Z"
}
```

---

## 🔐 2. Login Admin

```bash
curl -X POST https://studioflora.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@studioflora.site",
    "password": "Admin@2024!"
  }'
```

**Resposta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Kauany",
    "email": "admin@studioflora.site",
    "role": "admin"
  }
}
```

**💡 Copie o token para usar nas próximas requisições!**

---

## 👤 3. Ver Dados do Usuário Logado

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "user": {
    "sub": "1",
    "businessId": "1",
    "role": "admin",
    "name": "Kauany"
  }
}
```

---

## 📋 4. Listar Serviços (Público)

```bash
curl https://studioflora.site/api/public/services
```

**Resposta esperada:**
```json
{
  "business": {
    "id": 1,
    "name": "Studio Flora - Nails",
    "slug": "studio-flora"
  },
  "services": [
    {
      "id": 1,
      "name": "Manicure",
      "description": "Unha simples",
      "price": 40,
      "durationMinutes": 60,
      "depositType": "percentage",
      "depositAmount": 20
    },
    {
      "id": 2,
      "name": "Pedicure",
      "description": "Unha dos pés",
      "price": 50,
      "durationMinutes": 60,
      "depositType": "percentage",
      "depositAmount": 20
    }
  ]
}
```

---

## 🗓️ 5. Ver Horários Disponíveis (Público)

```bash
# Substituir a data por uma data futura
curl "https://studioflora.site/api/public/availability?serviceId=1&date=2024-09-20"
```

**Resposta esperada:**
```json
{
  "date": "2024-09-20",
  "slots": [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00"
  ]
}
```

---

## 📅 6. Dashboard Admin (Protegido)

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "today": {
    "count": 3,
    "expectedRevenue": 150,
    "receivedDeposits": 30,
    "toReceive": 120
  },
  "next": {
    "time": "2024-09-17T14:00:00.000Z",
    "client": "Maria Silva",
    "service": "Manicure",
    "total": 40,
    "depositPaid": true
  },
  "appointments": [...]
}
```

---

## 💅 7. Listar Serviços Admin (Protegido)

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/admin/services \
  -H "Authorization: Bearer $TOKEN"
```

---

## ➕ 8. Criar Novo Serviço (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl -X POST https://studioflora.site/api/admin/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alongamento de Unhas",
    "description": "Alongamento com fibra de vidro",
    "price": 80,
    "depositType": "percentage",
    "depositValue": 25,
    "durationMinutes": 90,
    "bufferMinutes": 15,
    "active": true
  }'
```

---

## 👥 9. Listar Clientes (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/admin/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 10. Buscar Cliente (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl "https://studioflora.site/api/admin/clients?q=Maria" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📆 11. Listar Agendamentos (Admin)

```bash
TOKEN="cole-seu-token-aqui"

# Todos os agendamentos
curl https://studioflora.site/api/admin/appointments \
  -H "Authorization: Bearer $TOKEN"

# Filtrar por data
curl "https://studioflora.site/api/admin/appointments?from=2024-09-17&to=2024-09-17" \
  -H "Authorization: Bearer $TOKEN"

# Filtrar por status
curl "https://studioflora.site/api/admin/appointments?status=confirmed" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ➕ 12. Criar Agendamento Manual (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl -X POST https://studioflora.site/api/admin/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": 1,
    "date": "2024-09-20",
    "time": "14:00",
    "client": {
      "name": "Ana Paula",
      "phone": "11987654321",
      "email": "ana@email.com"
    },
    "notes": "Cliente preferencial"
  }'
```

---

## 📝 13. Atualizar Status do Agendamento (Admin)

```bash
TOKEN="cole-seu-token-aqui"
APPOINTMENT_ID=1

# Confirmar
curl -X PATCH https://studioflora.site/api/admin/appointments/$APPOINTMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'

# Completar
curl -X PATCH https://studioflora.site/api/admin/appointments/$APPOINTMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Cancelar
curl -X PATCH https://studioflora.site/api/admin/appointments/$APPOINTMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
```

---

## 🕐 14. Ver Horários de Funcionamento (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/admin/business-hours \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✏️ 15. Atualizar Horários de Funcionamento (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl -X PUT https://studioflora.site/api/admin/business-hours \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"weekday": 0, "isOpen": false, "openTime": "00:00", "closeTime": "00:00"},
    {"weekday": 1, "isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
    {"weekday": 2, "isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
    {"weekday": 3, "isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
    {"weekday": 4, "isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
    {"weekday": 5, "isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
    {"weekday": 6, "isOpen": true, "openTime": "09:00", "closeTime": "15:00"}
  ]'
```

---

## 🚫 16. Criar Bloqueio de Horário (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl -X POST https://studioflora.site/api/admin/blocked-times \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2024-09-20T12:00:00",
    "endAt": "2024-09-20T13:00:00",
    "reason": "Almoço"
  }'
```

---

## 💳 17. Listar Pagamentos (Admin)

```bash
TOKEN="cole-seu-token-aqui"

curl https://studioflora.site/api/admin/payments \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 18. Fluxo Completo: Cliente Fazendo Agendamento

### Passo 1: Cliente vê serviços disponíveis
```bash
curl https://studioflora.site/api/public/services
```

### Passo 2: Cliente verifica horários disponíveis
```bash
curl "https://studioflora.site/api/public/availability?serviceId=1&date=2024-09-20"
```

### Passo 3: Cliente cria o agendamento
```bash
curl -X POST https://studioflora.site/api/public/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": 1,
    "date": "2024-09-20",
    "time": "14:00",
    "client": {
      "name": "Carla Santos",
      "phone": "11999887766",
      "email": "carla@email.com"
    },
    "notes": "Primeira vez"
  }'
```

**Resposta:**
```json
{
  "token": "uuid-do-agendamento",
  "status": "pending_payment",
  "requiresDeposit": true,
  "appointment": {
    "service": "Manicure",
    "startAt": "2024-09-20T14:00:00.000Z",
    "endAt": "2024-09-20T15:00:00.000Z",
    "totalAmount": 40,
    "depositAmount": 20
  },
  "next": {
    "action": "pay_pix",
    "endpoint": "/api/public/payments/pix"
  }
}
```

### Passo 4: Cliente gera PIX para pagamento
```bash
curl -X POST https://studioflora.site/api/public/payments/pix \
  -H "Content-Type: application/json" \
  -d '{
    "token": "uuid-do-agendamento"
  }'
```

### Passo 5: Cliente consulta o agendamento
```bash
curl https://studioflora.site/api/public/appointments/uuid-do-agendamento
```

---

## 📱 Testando com Postman/Insomnia

Importe esta coleção:

```json
{
  "name": "Studio Flora API",
  "baseUrl": "https://studioflora.site",
  "auth": {
    "type": "bearer",
    "token": "{{JWT_TOKEN}}"
  }
}
```

---

## 🐛 Respostas de Erro Comuns

### 401 Unauthorized
```json
{
  "message": "Nao autorizado"
}
```
➡️ Token inválido ou expirado. Faça login novamente.

### 400 Bad Request
```json
{
  "message": "Dados invalidos",
  "issues": {
    "fieldErrors": {...}
  }
}
```
➡️ Verifique os dados enviados.

### 404 Not Found
```json
{
  "message": "Route GET:/rota not found"
}
```
➡️ Rota não existe. Verifique a URL.

### 500 Internal Server Error
```json
{
  "message": "Erro interno"
}
```
➡️ Veja os logs: `pm2 logs studioflora`

---

## 🎉 Pronto!

Sua API está funcionando se todos esses testes passarem! ✅
