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

    // Initialize MySQL connection pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 20,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 10000, // Увеличим таймаут для Docker окружения
      charset: 'UTF8MB4_GENERAL_CI'
    });
    console.log('MySQL pool initialized');
  }

  async connect() {
    try {
      const connection = await this.pool.getConnection();
      console.log('MySQL pool connected successfully');
      connection.release();
      const [rows] = await this.pool.query('SELECT NOW() as now_time');
      console.log('MySQL connection verified with test query:', rows[0]);
      await this.pool.query('ALTER TABLE t_pdfs MODIFY sections_json MEDIUMTEXT');
      this.isDbConnected = true;
      return true;
    } catch (err) {
      this.isDbConnected = false;
      const errorMessage = `CRITICAL DATABASE ERROR: ${err.message}`;
      console.error(errorMessage);
      // Мы не выходим здесь сразу, чтобы server.js мог записать лог и корректно завершиться
      throw err;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      console.log('MySQL pool disconnected');
    } catch (err) {
      console.error('Database Error [disconnect]:', err.message);
    }
  }

  // Method to insert request data into t_requests table
  async insertRequest(neuronet, fromUrl, prompt) {
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
      return null;
    }
  }

  // Method to get all requests from the database
  async getAllRequests() {
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
    let connection;
    try {
      connection = await this.pool.getConnection();
      const query = `
        INSERT INTO t_users (username, password, description)
        VALUES (?, ?, ?)
      `;
      await connection.query(query, [username, passwordHash, description]);
      return true;
    } catch (err) {
      console.error('Database Error [createUser]:', {
        message: err.message,
        code: err.code,
        sql: err.sql
      });
      return false;
    } finally {
      if (connection) connection.release();
    }
  }
  // Method to get all users
  async getAllUsers() {
    try {
      const [rows] = await this.pool.query('SELECT username FROM t_users ORDER BY created_at ASC');
      return rows.map(row => row.username);
    } catch (err) {
      console.error('Database Error [getAllUsers]:', err.message);
      return [];
    }
  }

  // Method to save PDF metadata
  async savePdfMetadata(pdfId, themeId, filename, sections) {
    try {
      const query = `
        INSERT INTO t_pdfs (id, theme_id, filename, sections_json)
        VALUES (?, ?, ?, ?)
      `;
      await this.pool.query(query, [pdfId, themeId, filename, JSON.stringify(sections)]);
      return true;
    } catch (err) {
      console.error('Database Error [savePdfMetadata]:', err.message);
      throw err;
    }
  }

  // Method to get PDF sections
  async getPdfSections(pdfId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT sections_json FROM t_pdfs WHERE id = ?',
        [pdfId]
      );
      if (rows.length > 0) {
        return typeof rows[0].sections_json === 'string'
          ? JSON.parse(rows[0].sections_json)
          : rows[0].sections_json;
      }
      return null;
    } catch (err) {
      console.error('Database Error [getPdfSections]:', err.message);
      return null;
    }
  }

  // Method to delete PDF metadata by theme ID
  async deletePdfByThemeId(themeId) {
    try {
      const query = 'DELETE FROM t_pdfs WHERE theme_id = ?';
      const [result] = await this.pool.query(query, [themeId]);
      console.log(`Удалено ${result.affectedRows} записей PDF для темы "${themeId}" из MySQL`);
      return result.affectedRows;
    } catch (err) {
      console.error('Database Error [deletePdfByThemeId]:', err.message);
      return 0;
    }
  }

  // Method to get PDF by theme ID
  async getPdfByThemeId(themeId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_pdfs WHERE theme_id = ? ORDER BY upload_date DESC LIMIT 1',
        [themeId]
      );
      if (rows.length > 0) {
        const row = rows[0];
        return {
          ...row,
          sections: typeof row.sections_json === 'string'
            ? JSON.parse(row.sections_json)
            : row.sections_json
        };
      }
      return null;
    } catch (err) {
      console.error('Database Error [getPdfByThemeId]:', err.message);
      return null;
    }
  }

  // Method to get PDF metadata by ID
  async getPdfMetadata(pdfId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM t_pdfs WHERE id = ?',
        [pdfId]
      );
      if (rows.length > 0) {
        const row = rows[0];
        return {
          ...row,
          sections: typeof row.sections_json === 'string'
            ? JSON.parse(row.sections_json)
            : row.sections_json
        };
      }
      return null;
    } catch (err) {
      console.error('Database Error [getPdfMetadata]:', err.message);
      return null;
    }
  }

  // Method to update PDF sections
  async updatePdfSections(pdfId, sections) {
    try {
      const query = 'UPDATE t_pdfs SET sections_json = ? WHERE id = ?';
      const [result] = await this.pool.query(query, [JSON.stringify(sections), pdfId]);
      if (result.affectedRows === 0) {
        throw new Error(`PDF metadata not found: ${pdfId}`);
      }
      return true;
    } catch (err) {
      console.error('Database Error [updatePdfSections]:', err.message);
      throw err;
    }
  }

  // Method to count PDFs by theme ID
  async countPdfsByThemeId(themeId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT COUNT(*) as count FROM t_pdfs WHERE theme_id = ?',
        [themeId]
      );
      return rows[0].count;
    } catch (err) {
      console.error('Database Error [countPdfsByThemeId]:', err.message);
      return 0;
    }
  }

} export default new DatabaseService();
