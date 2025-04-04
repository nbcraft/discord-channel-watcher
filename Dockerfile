FROM node:22.14.0-slim

WORKDIR /usr/src/app

COPY . .

CMD [ "node", "./index.js" ]
