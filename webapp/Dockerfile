FROM node:18 AS ui-build
WORKDIR /usr/src/app
COPY . .
RUN npm install && npm install @angular/cli && npm run build-local

FROM node:18 AS server-build

WORKDIR /root/

COPY --from=ui-build /usr/src/app/build ./build
COPY package*.json ./
RUN npm install
COPY server.js ./

EXPOSE 3001

CMD [ "node", "server.js" ]