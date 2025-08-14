import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const DB = {
  USERNAME: process.env.DB_USERNAME || '',
  PASSWORD: process.env.DB_PASSWORD || '',
  ADDRESS: process.env.DB_ADDRESS || 'localhost:27017',
  ENVIROMENT: process.env.DB_ENVIRONMENT || process.env.NODE_ENV || 'development'
};

export default DB;