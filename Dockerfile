FROM node:18
WORKDIR /app
COPY product-service/package*.json ./
RUN npm install
COPY product-service/ .
EXPOSE 3001
CMD ["node", "src/index.js"]