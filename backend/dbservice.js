// Database service

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.isDbConnected = false;
    this.dbEnabled = true;

    // Initialize MySQL connection pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 20, waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 5000 // Таймаут 5 секунд для быстрой проверки
    });

    console.log('MySQL pool initialized');
    this.checkInitialConnection();
  }

  async checkInitialConnection() {
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      this.isDbConnected = true;
      console.log('MySQL initial connection successful');
    } catch (err) {
      this.isDbConnected = false;
      this.dbEnabled = false;
      console.error('MySQL initial connection failed. Database features disabled.', err.message);
    }
  }

  async connect() {
    if (!this.dbEnabled) return false;
    try {
      const connection = await this.pool.getConnection();
      console.log('MySQL pool connected successfully');
      connection.release();
      const [rows] = await this.pool.query('SELECT NOW() as now_time');
      console.log('MySQL connection verified with test query:', rows[0]);
      this.isDbConnected = true;
      return true;
    } catch (err) {
      this.isDbConnected = false;
      this.dbEnabled = false;
      console.error('Database Connection Error [connect]:', err.message);
      return false;
    }
  }

  async disconnect() {
    if (!this.dbEnabled) return;
    try {
      await this.pool.end();
      console.log('MySQL pool disconnected');
    } catch (err) {
      console.error('Database Error [disconnect]:', err.message);
    }
  }

  // Method to insert request data into t_requests table
  async insertRequest(neuronet, fromUrl, prompt) {
    if (!this.dbEnabled) return null;
    try {
      const now = new Date();
      const query = `
        INSERT INTO t_requests (datetime, neuronet, from_url, text)
        VALUES (?, ?, ?, ?)
      `;
      const values = [now, neuronet, fromUrl, prompt];
      const [result] = await this.pool.query(query, values);
      return result;
    } catch (err) {
      console.error('Database Error [insertRequest]:', err.message);
      this.dbEnabled = false; // Отключаем после первой ошибки
      return null;
    }
  }

  // Method to get all requests from the database
  async getAllRequests() {
    if (!this.dbEnabled) return [];
    try {
      const [rows] = await this.pool.query('SELECT * FROM t_requests ORDER BY datetime DESC');
      return rows;
    } catch (err) {
      console.error('Database Error [getAllRequests]:', err.message);
      return [];
    }
  }

  // Method to get requests by neuronet
  async getRequestsByNeuronet(neuronet) {
    if (!this.dbEnabled) return [];
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_requests WHERE neuronet = ? ORDER BY datetime DESC',
        [neuronet]
      );
      return rows;
    } catch (err) {
      console.error('Database Error [getRequestsByNeuronet]:', err.message);
      return [];
    }
  }

  // Method to get requests by date range
  async getRequestsByDateRange(startDate, endDate) {
    if (!this.dbEnabled) return [];
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_requests WHERE datetime BETWEEN ? AND ? ORDER BY datetime DESC',
        [startDate, endDate]
      );
      return rows;
    } catch (err) {
      console.error('Database Error [getRequestsByDateRange]:', err.message);
      return [];
    }
  }
}

export default new DatabaseService();
