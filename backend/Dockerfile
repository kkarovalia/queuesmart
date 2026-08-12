FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS dev
LABEL build.target="dev"
COPY . .
EXPOSE 3001 9229
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
RUN npx prisma generate
RUN npm run build
RUN cp -r src/generated/prisma/*.so.node dist/generated/prisma/ 2>/dev/null || true
RUN npm prune --omit=dev

FROM node:26-alpine AS production
LABEL build.target="production"
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]