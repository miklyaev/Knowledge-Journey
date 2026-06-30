CREATE TABLE IF NOT EXISTS t_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  total_score INT,
  date_time DATETIME,
  details JSON,
  INDEX(username)
);