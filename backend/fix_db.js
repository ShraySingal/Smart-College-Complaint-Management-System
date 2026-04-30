const { sequelize } = require('./config/db');
require('dotenv').config();

const fix = async () => {
    try {
        await sequelize.authenticate();
        require('./models/index');
        console.log("Force syncing database (dropping all tables)...");
        await sequelize.sync({ force: true });
        console.log("✅ Database force synced successfully!");
        process.exit(0);
    } catch(e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}
fix();
