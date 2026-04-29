const { Feedback, Complaint } = require('../models/index');

const submitFeedback = async (req, res) => {
    try {
        const { message, rating, complaintId } = req.body;
        const studentId = req.user.id;

        if (!message || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid feedback data' });
        }

        // Verify complaint exists if ID provided and check for existing feedback
        if (complaintId) {
            const complaint = await Complaint.findByPk(complaintId);
            if (!complaint) {
                return res.status(404).json({ message: 'Complaint not found' });
            }

            const existingFeedback = await Feedback.findOne({ where: { complaintId } });
            if (existingFeedback) {
                return res.status(400).json({ message: 'Feedback already submitted for this complaint' });
            }
        }

        const feedback = await Feedback.create({
            studentId,
            complaintId: complaintId || null,
            message,
            rating
        });

        res.status(201).json({ 
            success: true, 
            message: 'Feedback submitted successfully',
            feedback
        });
    } catch (error) {
        console.error("Feedback error:", error);
        res.status(500).json({ message: 'Server error submitting feedback' });
    }
};

const getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching feedback' });
    }
};

module.exports = { submitFeedback, getAllFeedback };
