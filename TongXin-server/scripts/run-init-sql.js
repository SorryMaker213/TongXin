const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
    let connection;
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf-8');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '123456',
            multipleStatements: true
        });

        await connection.query(sql);
        console.log('Database initialized');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

run();