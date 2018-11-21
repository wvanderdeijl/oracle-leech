# oracle-leech

## Development Setup

* Download basiclite and sqlplus instantclient 18.3 for Linux from https://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html and put in this project root
```
docker-compose pull
docker-compose build
docker-compose up
docker-compose exec node sh -c "/opt/oracle/instantclient_18_3/sqlplus system/oracle@oracle/EE.oracle.docker @update.sql"
```
