const User = require('./User');
const Complaint = require('./Complaint');
const Feedback = require('./Feedback');
const Message = require('./Message');
const Notification = require('./Notification');
const ComplaintTimeline = require('./ComplaintTimeline');

// User & Complaints
User.hasMany(Complaint, { foreignKey: 'studentId' });
Complaint.belongsTo(User, { foreignKey: 'studentId' });

// User & Feedback
User.hasMany(Feedback, { foreignKey: 'studentId' });
Feedback.belongsTo(User, { foreignKey: 'studentId' });

// Complaint & Feedback
Complaint.hasOne(Feedback, { foreignKey: 'complaintId' });
Feedback.belongsTo(Complaint, { foreignKey: 'complaintId' });

// Complaint & Messages
Complaint.hasMany(Message, { foreignKey: 'complaintId' });
Message.belongsTo(Complaint, { foreignKey: 'complaintId' });

// User & Messages
User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

// User & Notifications
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Complaint & Timeline
Complaint.hasMany(ComplaintTimeline, { foreignKey: 'complaintId' });
ComplaintTimeline.belongsTo(Complaint, { foreignKey: 'complaintId' });

// Timeline & User (who performed the action)
User.hasMany(ComplaintTimeline, { foreignKey: 'performedBy' });
ComplaintTimeline.belongsTo(User, { foreignKey: 'performedBy' });

module.exports = {
    User,
    Complaint,
    Feedback,
    Message,
    Notification,
    ComplaintTimeline
};
