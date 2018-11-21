oracle-leech

## Development Setup

* Download basiclite and sqlplus instantclient 18.3 for Linux from https://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html
* Run `docker-compose pull` to download all necessary docker images
* Run `docker-compose build` to build all containers
* Run `docker-compose --detach up` to start all containers
* Run `docker-compose exec node bash` to start a linux bash shell in the node development container
* Within that bash shell run `npm install` and `npx ts-node ./index.ts`

### Optional

Download  MacOS Oracle client from http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html and unzip locally so it creates a instantclient_12_2 directory here. Download at least the `Basic Light Package`  but you can also include the `SQL*Plus` package if you want

## Links

- https://blog.dbi-services.com/event-sourcing-cqn-is-not-a-replacement-for-cdc/ describing
  performance issues with CQN that we are trying to reproduce and solve
- https://github.com/oracle/node-oracledb nodejs driver for Oracle
- https://hub.docker.com/r/wnameless/oracle-xe-11g/ docker container with XE database
