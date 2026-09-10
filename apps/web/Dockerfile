FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages ./packages
RUN npm install --ignore-scripts
COPY apps/web ./apps/web
RUN npm --workspace apps/web run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
CMD ["npm","--workspace","apps/web","run","start"]
