const mysql = require('mysql2/promise')

class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
            user: process.env.DB_USER || 'arRTZFmT1bAk4nj.root',
            password: process.env.DB_PASSWORD || 'iG7i15Hfd9OyTrwy',
            database: process.env.DB_NAME || 'microservices_db',
            port: process.env.DB_PORT || 4000, // TiDB default serverless port
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: {
                rejectUnauthorized: true
            }
        });
    }

    async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    async getConnection() {
        return this.pool.getConnection();
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = new Database();
