#!/bin/bash
# ==================================================
# Script de Deploy Automático - Studio Flora
# ==================================================

set -e  # Para em caso de erro

echo "🚀 Iniciando deploy..."

# 1. Atualizar código do GitHub
echo "📥 Baixando última versão do GitHub..."
git pull origin main

# 2. Instalar/Atualizar dependências
echo "📦 Instalando dependências..."
npm install --production

# 3. Rodar migrations (se houver novas)
echo "🔄 Executando migrations..."
npm run migrate

# 4. Compilar TypeScript
echo "🏗️  Compilando TypeScript..."
npm run build

# 5. Reiniciar aplicação com PM2
echo "♻️  Reiniciando aplicação..."
pm2 restart studioflora

# 6. Verificar status
echo "✅ Verificando status..."
pm2 status studioflora

echo ""
echo "✅ Deploy concluído com sucesso!"
echo "📊 Ver logs: pm2 logs studioflora"
echo "🌐 Testar: curl https://studioflora.site/health"
