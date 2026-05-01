// server/db.js
const mysql = require('mysql2/promise');

let pool = null;
let connectionError = null;

async function getPool() {
    if (pool) return pool;
    
    if (connectionError) {
        throw connectionError;
    }
    
    try {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'cscse_assistant',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            enableKeepAlive: true
        });
        
        const connection = await pool.getConnection();
        console.log('✅ MySQL 连接成功');
        connection.release();
        
        return pool;
    } catch (error) {
        console.error('❌ MySQL 连接失败:', error.message);
        connectionError = error;
        throw error;
    }
}

/**
 * 执行查询 - 修复参数处理
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数数组，默认为空数组
 */
async function query(sql, params = []) {
    try {
        const pool = await getPool();
        
        // 确保 params 是数组
        const safeParams = Array.isArray(params) ? params : [];
        
        // 如果没有参数，使用 query 而不是 execute
        let rows;
        if (safeParams.length === 0) {
            [rows] = await pool.query(sql);
        } else {
            [rows] = await pool.execute(sql, safeParams);
        }
        
        return rows;
    } catch (error) {
        console.error('查询执行失败:', error.message);
        console.error('SQL:', sql);
        console.error('参数:', params);
        throw error;
    }
}

/**
 * 执行更新/插入/删除
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数数组
 */
async function execute(sql, params = []) {
    try {
        const pool = await getPool();
        const safeParams = Array.isArray(params) ? params : [];
        
        let result;
        if (safeParams.length === 0) {
            [result] = await pool.query(sql);
        } else {
            [result] = await pool.execute(sql, safeParams);
        }
        
        return result;
    } catch (error) {
        console.error('执行失败:', error.message);
        console.error('SQL:', sql);
        console.error('参数:', params);
        throw error;
    }
}

module.exports = { getPool, query, execute };