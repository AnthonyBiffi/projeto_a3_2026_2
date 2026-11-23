FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/src ./src
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3333}/health || exit 1
CMD ["node", "src/index.js"]
