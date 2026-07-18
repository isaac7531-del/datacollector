FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY docs ./docs
COPY migrations ./migrations
COPY README.md ./

RUN npm run build

EXPOSE 3333
CMD ["npm", "start"]
