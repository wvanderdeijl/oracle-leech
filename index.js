#!/usr/bin/env node

const oracledb = require('oracledb');

(async function () {
    const conn = await oracledb.getConnection({ user: "system", password: "oracle", connectString: "localhost/xe" });
    try {
        const result = await conn.execute(`SELECT * FROM DUAL`);
        console.log(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.close();
    }
})();
