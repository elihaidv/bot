FROM node:17.1.0

WORKDIR /app

ADD . /app

RUN npm install

CMD ["node", "Simulator/Simulate.js", "7", "638ca8943aa3e742a50d8846", "2022-11-04 14:02:51", "2022-12-01 14:02:51", "quiet"]