const cron = require('node-cron');
const { Complaint, User } = require('../models/index');
const { Op } = require('sequelize');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const AWS = require('aws-sdk');

const setupCronJobs = (io) => {
    // 1. SLA Check every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('Running SLA check...');
        try {
            const overdueComplaints = await Complaint.findAll({
                where: {
                    status: { [Op.ne]: 'Resolved' },
                    deadline: { [Op.lt]: new Date() }
                }
            });

            if (overdueComplaints.length > 0) {
                logger.warn(`Found ${overdueComplaints.length} overdue complaints!`);
                io.emit('admin_alert', { 
                    type: 'OVERDUE', 
                    message: `You have ${overdueComplaints.length} overdue complaints!` 
                });
            }
        } catch (error) {
            logger.error('SLA Cron Error:', error);
        }
    });

    // 2. Database Backup every day at midnight
    cron.schedule('0 0 * * *', () => {
        logger.info('Starting database backup...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, `../backups/backup-${timestamp}.sql`);
        
        const dbUri = process.env.POSTGRES_URI;
        const cmd = `pg_dump "${dbUri}" > "${backupPath}"`;

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                logger.error(`Backup failed: ${error.message}`);
                return;
            }
            logger.info('✅ Database backup completed successfully');

            // 3. Upload to Cloud (AWS S3)
            if (process.env.AWS_ACCESS_KEY) {
                const s3 = new AWS.S3({
                    accessKeyId: process.env.AWS_ACCESS_KEY,
                    secretAccessKey: process.env.AWS_SECRET_KEY
                });

                const fileContent = fs.readFileSync(backupPath);
                const params = {
                    Bucket: process.env.AWS_S3_BUCKET || 'my-college-backups',
                    Key: `backups/${path.basename(backupPath)}`,
                    Body: fileContent
                };

                s3.upload(params, (err, data) => {
                    if (err) logger.error('Cloud upload failed:', err);
                    else logger.info(`✅ Backup uploaded to Cloud: ${data.Location}`);
                });
            } else {
                logger.info('Cloud backup skipped: AWS credentials missing in .env');
            }
        });
    });
};

module.exports = setupCronJobs;
