# Bot Discord

Bot do Discord com sistema de ID, Whitelist, Ticket, Embed e controle de permissões por cargo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — inicia o servidor e o bot (porta 5000)
- Variável obrigatória: `DISCORD_TOKEN` — token do bot no Discord Developer Portal

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + discord.js v14
- Build: esbuild (ESM bundle)
- Config persistida: arquivos JSON em `bot-data/` na raiz do projeto

## Comandos do Bot

### 🪪 ID
- `/pedir-id` — registra um ID único para o usuário
- `/ver-id [usuario]` — mostra o ID do usuário (ou de outro)
- `/definir-id-inicial <numero>` — define o número de partida dos IDs (admin, só antes do primeiro ID)

### 📋 Whitelist
- `/whitelist` — envia o painel de whitelist no canal
- `/whitelist-conf` — painel de configuração (admin): nome, URL, thumbnail, perguntas (até 5), cor, cargo de aprovação, canal de aprovação

### 🎫 Ticket
- `/ticket` — envia o painel de tickets no canal
- `/ticket-configurar` — painel de configuração (admin): nome, descrição, autor, cor, URL, thumbnail, tipos de ticket, canal de logs

### 🎨 Embed
- `/embed <titulo> <descricao>` — cria um embed personalizado com cor, URL, thumbnail, imagem, rodapé, autor e canal de destino

### ⚙️ Permissões
- `/conf` — define qual cargo pode usar cada comando. Se não configurado, todos podem usar.

## Arquitetura

- Bot integrado ao api-server (`artifacts/api-server/src/bot/`)
- Dados salvos em `bot-data/*.json` (ids, whitelist-config, ticket-config, conf)
- Slash commands registrados globalmente via REST na inicialização

## User preferences

- Responder em português
