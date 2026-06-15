const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ComplaintTimeline = sequelize.define('ComplaintTimeline', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    complaintId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    performedBy: {
        type: DataTypes.UUID,
        allowNull: true,
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['complaintId'] }
    ]
});

module.exports = ComplaintTimeline;
