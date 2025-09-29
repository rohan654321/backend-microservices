const mysql = require('mysql2/promise')

class Database{
    constructor(){
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    /**
     * Run a simple query with params
     * @param {string} sql - SQL query
     * @param {Array} param - values for placeholders
     * @returns {Promise<Array>} - rows
     */

    async query(sql, params  = []){
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    /**
     * Get a connection for transactions
     * @returns {Promise<Connection>}
     */

    async getConnection(){
        return this.pool.getConnection();
    }

    /**
     * Gracefully close all connections
     */
    async close(){
        await this.pool.end();
    }
}
module.exports = new Database;
