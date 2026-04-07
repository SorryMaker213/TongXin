const db = require('../src/config/db');

async function run() {
    try {
        await db.query('DROP DATABASE IF EXISTS tongxin');
        console.log('Database dropped');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();