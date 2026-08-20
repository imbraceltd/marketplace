FROM node:18-slim as base

# Enable pnpm with specific version
RUN corepack enable && corepack prepare pnpm@9.0 --activate

# Install dependencies stage
FROM base AS deps
WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY pnpm-lock.yaml ./
COPY package.json ./

# Configure pnpm
RUN pnpm config set store-dir .pnpm-store
# Use frozen-lockfile to ensure exact versions from lock file
RUN pnpm install --frozen-lockfile --prod

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .
# Run build
RUN pnpm build

# Runner stage
FROM node:18-slim AS runner
WORKDIR /app

# Copy only production dependencies and built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Ship the SQL migrations + journal so the entrypoint applies pending
# migrations before the app starts. drizzle-orm's migrator takes an advisory
# lock so concurrent containers don't race; on failure migrate exits non-zero
# and the container restart-loops with the error.
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 9982

# Migrate then serve. The migrator is a no-op when the DB journal is current.
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/index.js"]