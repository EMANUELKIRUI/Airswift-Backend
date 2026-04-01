const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use SQLite for development if no PostgreSQL config
const sequelize = process.env.DB_HOST
  ? new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false,
      }
    )
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: false,
    });

module.exports = sequelize;