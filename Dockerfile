FROM node:20 AS builder
WORKDIR /app/builder

COPY package.json jest.config.js pnpm-lock.yaml tsconfig.json ./

RUN npm install

COPY . . 
RUN npm run build

FROM node:20

WORKDIR /app/backend
COPY --from=builder /app/builder/build ./build
COPY --from=builder /app/builder/node_modules ./node_modules

CMD ["node", "build/main.js"]