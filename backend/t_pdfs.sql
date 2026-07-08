CREATE TABLE IF NOT EXISTS t_pdfs (
  id VARCHAR(36) PRIMARY KEY,
  theme_id VARCHAR(50) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sections_json TEXT -- JSON массив разделов
);
