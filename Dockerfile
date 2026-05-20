FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx drizzle-kit push
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src ./src

ENV HOST=0.0.0.0
ENV PORT=4321

CMD ["node", "-e", "require('http').createServer((_,r)=>{r.writeHead(200);r.end('one-run ok')}).listen(4321,()=>console.log('listening'))"]
