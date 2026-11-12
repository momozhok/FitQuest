FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/frigo.sqlite
COPY --chown=node:node package.json server.mjs recipes.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
