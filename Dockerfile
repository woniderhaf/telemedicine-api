FROM node:19

WORKDIR src

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4444

CMD ["node", "server.js"]