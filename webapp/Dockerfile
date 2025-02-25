FROM node:18.20

WORKDIR /root/

COPY ./build ./build
COPY package*.json ./
RUN npm install --omit=dev && npm install express
COPY server.js ./

EXPOSE 3001

CMD [ "node", "server.js" ]
