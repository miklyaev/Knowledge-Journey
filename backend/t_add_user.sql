CREATE USER IF NOT EXISTS 'mikser'@'%' IDENTIFIED WITH mysql_native_password BY 'Tornado_Mikser_5';
GRANT ALL PRIVILEGES ON JourneyDb.* TO 'mikser'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;