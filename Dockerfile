FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN mkdir -p data && npx drizzle-kit push
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src ./src

EXPOSE 4321
ENV HOST=0.0.0.0
ENV PORT=4321

CMD sh -c "npx drizzle-kit push 2>&1; node dist/server/entry.mjs"
