FROM node:10

# Create app directory
WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install -y unzip libaio1

COPY instantclient-*-linux.* ./

RUN unzip instantclient-basiclite-linux.x64-18.3.0.0.0dbru.zip && \
    unzip instantclient-sqlplus-linux.x64-18.3.0.0.0dbru.zip && \
    mkdir -p /opt/oracle && \
    mv instantclient_18_3 /opt/oracle && \
    sh -c "echo /opt/oracle/instantclient_18_3 > /etc/ld.so.conf.d/oracle-instantclient.conf" && \
    ldconfig

COPY package*.json ./

RUN npm install

COPY . ./

CMD [ "npm", "start" ]
