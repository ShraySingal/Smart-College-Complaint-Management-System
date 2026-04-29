const { Message, User } = require('../models/index');

const getMessages = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const messages = await Message.findAll({
            where: { complaintId },
            include: [{ model: User, attributes: ['name', 'role'] }],
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { content } = req.body;

        const message = await Message.create({
            complaintId,
            senderId: req.user.id,
            content
        });

        const fullMessage = await Message.findByPk(message.id, {
            include: [{ model: User, attributes: ['name', 'role'] }]
        });

        // Notify room via socket
        req.app.get('io').to(complaintId).emit('new_message', fullMessage);

        res.status(201).json(fullMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
};

module.exports = { getMessages, sendMessage };
