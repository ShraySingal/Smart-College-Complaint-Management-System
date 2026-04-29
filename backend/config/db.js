const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.POSTGRES_URI, {
    dialect: 'postgres',
    logging: false, // set to console.log to see SQL queries
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ PostgreSQL Connected Successfully");

        // We require the models so Sequelize knows about them
        require('../models/index');

        await sequelize.sync({ alter: true });
        console.log("✅ PostgreSQL Models Synced");
    } catch (error) {
        console.error("❌ PostgreSQL Connection Error:", error);
    }
};

module.exports = { sequelize, connectDB };
