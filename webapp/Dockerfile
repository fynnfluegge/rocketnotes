FROM node:18.20

WORKDIR /root/

COPY ./build ./build
COPY package*.json ./
RUN npm install
COPY server.js ./

EXPOSE 3001

CMD [ "node", "server.js" ]
