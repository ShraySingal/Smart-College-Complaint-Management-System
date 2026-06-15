const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('complaint_update', 'escalation', 'system', 'resolution'),
        allowNull: false,
        defaultValue: 'system',
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['isRead'] }
    ]
});

module.exports = Notification;
