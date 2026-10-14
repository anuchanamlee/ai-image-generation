# ==========================================
# 1. Base Image
# ==========================================
FROM node:20-alpine AS base
# ✅ ลง OpenSSL ตรงนี้ทีเดียวจบ
RUN apk add --no-cache libc6-compat openssl

# ==========================================
# 2. Dependencies Stage
# ==========================================
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# ==========================================
# 3. Builder Stage
# ==========================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 🔥 [แก้ตรงนี้] บังคับให้สร้าง Database ที่ /app/dev.db (ระบุ Path เต็ม)
# จะได้ไม่ต้องเดาว่ามันไปโผล่ที่ไหน
ENV DATABASE_URL="file:/app/dev.db"

# สั่งสร้างไฟล์ Database
RUN npx prisma db push

# Generate Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# ==========================================
# 4. Runner Stage (Production)
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# User Setup
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# ✅ Copy Database (ตอนนี้ไฟล์อยู่ที่ /app/dev.db แน่นอนแล้ว)
COPY --from=builder --chown=nextjs:nodejs /app/dev.db ./dev.db

# 🔥 ตั้งค่า ENV ตอนรันให้ชี้ไปที่ไฟล์เดียวกัน
ENV DATABASE_URL="file:/app/dev.db"

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]