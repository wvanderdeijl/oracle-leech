import oracledb from 'oracledb';

const config = {
    connectString: 'localhost/xe',
    password: 'oracle',
    user: 'system',
};

// tslint:disable:no-console

(async () => {
    const conn = await oracledb.getConnection(config);
    try {
        const result = await conn.execute('SELECT * FROM DUAL');
        console.log(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.close();
    }
})();
