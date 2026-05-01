const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Complaint = sequelize.define('Complaint', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    category: {
        type: DataTypes.ENUM('Electricity', 'Water', 'Internet', 'Furniture', 'Hygiene', 'Other'),
        allowNull: false,
    },
    priority: {
        type: DataTypes.ENUM('High', 'Medium', 'Low'),
        allowNull: false,
        defaultValue: 'Low'
    },
    status: {
        type: DataTypes.ENUM('Pending', 'In Progress', 'Resolved'),
        defaultValue: 'Pending',
    },
    resolutionSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    resolutionAttachment: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    location: {
        type: DataTypes.ENUM('Hostel', 'Academic Block'),
        allowNull: false,
    },
    room: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    attachment: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['status'] },
        { fields: ['priority'] },
        { fields: ['studentId'] }
    ]
});

module.exports = Complaint;
