FROM node:20-alpine

RUN apk update && apk add nano

WORKDIR /app
COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3031

ENV PORT=3031
ENV DB_PORT=3306

CMD ["npm", "start"]