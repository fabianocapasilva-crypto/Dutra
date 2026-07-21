FROM node:22-slim

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config files first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy all workspace packages
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Create bot-data directory for persistent config files
RUN mkdir -p bot-data

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the api-server (compiles TypeScript via esbuild)
RUN pnpm --filter @workspace/api-server run build

# Runtime environment
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Start the server + bot
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
