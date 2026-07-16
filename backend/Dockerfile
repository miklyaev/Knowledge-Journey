FROM node:20-slim

RUN apt-get update && apt-get install -y nano && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3031

ENV PORT=3031
ENV DB_PORT=3306

CMD ["npm", "start"]