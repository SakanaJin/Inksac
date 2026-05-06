CREATE USER IF NOT EXISTS 'inkuser'@'localhost' IDENTIFIED BY 'password';

CREATE DATABASE IF NOT EXISTS Inksac;

GRANT ALL PRIVILEGES ON Inksac.* TO 'inkuser'@'localhost';

FLUSH PRIVILEGES;

USE Inksac;