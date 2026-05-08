// Database service module for Arduino Info Hub

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    // Initialize MySQL connection pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || '192.168.0.103',
      port: parseInt(process.env.DB_PORT || process.env.DB_POST || '3306', 10),
      database: process.env.DB_NAME || 'arduinodb',
      user: process.env.DB_USER || 'dbeaver',
      password: process.env.DB_PASSWORD || 'dasha2009',
      connectionLimit: 20, // Maximum number of connections in the pool
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    console.log('MySQL pool initialized');
  }

  async connect() {
    try {
      // Test the connection by acquiring a connection from the pool
      const connection = await this.pool.getConnection();
      console.log('MySQL pool connected successfully');
      connection.release(); // Release the connection back to the pool

      // Also test a simple query to ensure the database is accessible
      const [rows] = await this.pool.query('SELECT NOW() as now_time');
      console.log('MySQL connection verified with test query:', rows[0]);

      return true;
    } catch (err) {
      console.error('Database Connection Error [connect]:', {
        error: err.message,
        stack: err.stack,
        host: process.env.DB_HOST || process.env.DB_POST,
        database: process.env.DB_NAME
      });
      throw err;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      console.log('MySQL pool disconnected');
    } catch (err) {
      console.error('Database Error [disconnect]:', {
        error: err.message,
        stack: err.stack
      });
      throw err;
    }
  }

  // Method to insert request data into t_requests table
  async insertRequest(neuronet, fromUrl, prompt) {
    try {
      // Для типа datetime в MySQL передаем объект Date напрямую
      // Библиотека mysql2 автоматически конвертирует его в правильный формат
      const now = new Date();

      const query = `
        INSERT INTO t_requests (datetime, neuronet, from_url, text)
        VALUES (?, ?, ?, ?)
      `;

      const values = [now, neuronet, fromUrl, prompt];

      const [result] = await this.pool.query(query, values);
      return result;
    } catch (err) {
      console.error('Database Error [insertRequest]:', {
        error: err.message,
        stack: err.stack,
        neuronet,
        fromUrl,
        promptLength: prompt ? prompt.length : 0
      });
      throw err;
    }
  }

  // Method to get all requests from the database
  async getAllRequests() {
    try {
      const [rows] = await this.pool.query('SELECT * FROM t_requests ORDER BY datetime DESC');
      return rows;
    } catch (err) {
      console.error('Database Error [getAllRequests]:', {
        error: err.message,
        stack: err.stack
      });
      throw err;
    }
  }

  // Method to get requests by neuronet
  async getRequestsByNeuronet(neuronet) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_requests WHERE neuronet = ? ORDER BY datetime DESC',
        [neuronet]
      );
      return rows;
    } catch (err) {
      console.error('Database Error [getRequestsByNeuronet]:', {
        error: err.message,
        stack: err.stack,
        neuronet
      });
      throw err;
    }
  }

  // Method to get requests by date range
  async getRequestsByDateRange(startDate, endDate) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_requests WHERE datetime BETWEEN ? AND ? ORDER BY datetime DESC',
        [startDate, endDate]
      );
      return rows;
    } catch (err) {
      console.error('Database Error [getRequestsByDateRange]:', {
        error: err.message,
        stack: err.stack,
        startDate,
        endDate
      });
      throw err;
    }
  }
}

export default new DatabaseService();
