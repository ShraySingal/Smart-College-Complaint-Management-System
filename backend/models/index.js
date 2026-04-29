const User = require('./User');
const Complaint = require('./Complaint');
const Feedback = require('./Feedback');
const Message = require('./Message');

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

module.exports = {
    User,
    Complaint,
    Feedback,
    Message
};
