CREATE TABLE IF NOT EXISTS t_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  datetime DATETIME NOT NULL,
  neuronet VARCHAR(100) NOT NULL,
  from_url VARCHAR(2048) DEFAULT NULL,
  text MEDIUMTEXT NOT NULL,
  INDEX idx_requests_datetime (datetime),
  INDEX idx_requests_neuronet_datetime (neuronet, datetime)
);
