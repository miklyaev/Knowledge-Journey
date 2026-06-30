// Database service

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

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

  // Method to save a report
  async saveReport(reportData) {
    if (!this.dbEnabled) return false;
    try {
      const { username, topic, totalScore, details } = reportData;
      const now = new Date();
      const query = `
        INSERT INTO t_reports (username, topic, total_score, date_time, details)
        VALUES (?, ?, ?, ?, ?)
      `;
      const values = [username, topic, totalScore, now, JSON.stringify(details)];
      await this.pool.query(query, values);
      return true;
    } catch (err) {
      console.error('Database Error [saveReport]:', err.message);
      return false;
    }
  }

  // Method to get reports by username
  async getReportsByUsername(username) {
    if (!this.dbEnabled) return null;
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_reports WHERE username = ? ORDER BY date_time ASC',
        [username]
      );

      // Преобразуем данные из БД обратно в формат, ожидаемый фронтендом
      return rows.map(row => {
        const dateStr = new Date(row.date_time).toLocaleString('ru-RU');
        return {
          username: row.username,
          topic: row.topic,
          totalScore: row.total_score,
          dateTime: dateStr,
          details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
          timestamp: dateStr
        };
      });
    } catch (err) {
      console.error('Database Error [getReportsByUsername]:', err.message);
      return null;
    }
  }
  // Method to get a user by username
  async getUserByUsername(username) {
    if (!this.dbEnabled) return null;
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_users WHERE username = ?',
        [username]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Database Error [getUserByUsername]:', err.message);
      return null;
    }
  }

  // Method to create a new user
  async createUser(username, passwordHash, description) {
    if (!this.dbEnabled) return false;
    try {
      const query = `
        INSERT INTO t_users (username, password, description)
        VALUES (?, ?, ?)
      `;
      await this.pool.query(query, [username, passwordHash, description]);
      return true;
    } catch (err) {
      console.error('Database Error [createUser]:', err.message);
      return false;
    }
  }

  // Method to get all users
  async getAllUsers() {
    if (!this.dbEnabled) return [];
    try {
      const [rows] = await this.pool.query('SELECT username FROM t_users ORDER BY created_at ASC');
      return rows.map(row => row.username);
    } catch (err) {
      console.error('Database Error [getAllUsers]:', err.message);
      return [];
    }
  }
}
export default new DatabaseService();
