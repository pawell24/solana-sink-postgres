FROM postgres:latest AS postgres_db
COPY init.sql /docker-entrypoint-initdb.d/

FROM node:latest AS node_app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "solana-sink.js" ]
