FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY data/ ./data/
RUN npm install -g ts-node typescript
EXPOSE 8080
ENV PORT=8080
CMD ["ts-node", "src/server.ts"]
