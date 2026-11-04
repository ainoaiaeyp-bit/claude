FROM node:22-alpine
WORKDIR /app
COPY ai-proxy.js .
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "ai-proxy.js"]
