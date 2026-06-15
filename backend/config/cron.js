const cron = require('node-cron');
const { Complaint, User } = require('../models/index');
const { Op } = require('sequelize');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

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

                // Auto-escalation logic
                for (const complaint of overdueComplaints) {
                    const hoursOverdue = (Date.now() - new Date(complaint.deadline).getTime()) / (1000 * 60 * 60);
                    let newLevel = 0;
                    if (hoursOverdue > 48) newLevel = 2;
                    else if (hoursOverdue > 24) newLevel = 1;

                    if (newLevel > complaint.escalationLevel) {
                        await complaint.update({ 
                            escalationLevel: newLevel, 
                            escalatedAt: new Date() 
                        });
                        logger.warn(`Complaint ${complaint.id} escalated to level ${newLevel}`);
                        
                        io.emit('admin_alert', { 
                            type: 'ESCALATION', 
                            message: `CRITICAL: Complaint "${complaint.title}" escalated to Level ${newLevel}!`,
                            complaintId: complaint.id
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('SLA Cron Error:', error);
        }
    });

    // 2. Database Backup every day at midnight (Local only — free)
    cron.schedule('0 0 * * *', () => {
        logger.info('Starting database backup...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        
        const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);
        const dbUri = process.env.POSTGRES_URI;
        const cmd = `pg_dump "${dbUri}" > "${backupPath}"`;

        exec(cmd, (error) => {
            if (error) {
                logger.error(`Backup failed: ${error.message}`);
                return;
            }
            logger.info('✅ Database backup completed (Local Storage)');
        });
    });
};

module.exports = setupCronJobs;
