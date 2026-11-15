FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
EXPOSE 3000
# Migrate only. Never seed production from this image.
# Retry because a sleeping free database can miss the first lock attempt.
CMD ["sh", "-c", "ok=0; for i in 1 2 3 4 5; do npx prisma migrate deploy && ok=1 && break; echo migrate retry $i; sleep 8; done; test \"$ok\" = 1 && node dist/main.js"]
