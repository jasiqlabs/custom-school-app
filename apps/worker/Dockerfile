FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
COPY prisma ./prisma
RUN npm install --ignore-scripts
COPY apps/worker ./apps/worker
RUN npx prisma generate --schema prisma/schema.prisma && npm --workspace apps/worker run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/prisma ./prisma
CMD ["node","apps/worker/dist/main.js"]
