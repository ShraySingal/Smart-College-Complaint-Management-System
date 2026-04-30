const { User, Complaint, Message, Feedback } = require('../models/index');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                hostel: user.hostel,
                academicYear: user.academicYear,
                profilePhoto: user.profilePhoto
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateRoom = async (req, res) => {
    try {
        const { hostel } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.hostel = hostel;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            hostel: user.hostel
        });
    } catch (error) {
        console.error("Update room error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        const redisClient = require('../config/redis');
        // Blacklist the token for 30 days (matching the token expiry)
        await redisClient.setEx(`blacklist_${token}`, 30 * 24 * 60 * 60, 'true');

        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

const updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        
        const user = await User.findByPk(req.user.id);
        user.profilePhoto = req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Profile photo updated', 
            profilePhoto: user.profilePhoto 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' });

        user.password = newPassword; // Hook will hash it
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const { sendWelcomeEmail } = require('../config/mailer');
const { sendWelcomeSMS } = require('../utils/sms');

const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, department, phone, hostel, academicYear } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password, role, department, phone, hostel, academicYear });
        
        // Trigger Welcome Email & SMS
        await sendWelcomeEmail(user, password);
        await sendWelcomeSMS(user);

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ success: true, token, user });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: 'Registration error' });
    }
};

const getStaff = async (req, res) => {
    try {
        const staff = await User.findAll({
            where: {
                role: { [Op.in]: ['Staff', 'Admin'] }
            },
            attributes: ['id', 'name', 'role', 'department']
        });
        res.status(200).json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff list' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // In a real app, send email with token. Here we mock it.
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        
        res.status(200).json({ success: true, message: 'Reset link sent to your email (check console)' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'department', 'status']
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.status = user.status === 'Active' ? 'Inactive' : 'Active';
        await user.save();

        res.status(200).json({ success: true, status: user.status });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Delete all related data forceably
        await Message.destroy({ where: { senderId: userId }, force: true });
        await Feedback.destroy({ where: { studentId: userId }, force: true });
        await Complaint.destroy({ where: { studentId: userId }, force: true });
        
        // Remove from assignments if faculty/staff
        await Complaint.update({ assignedTo: null }, { where: { assignedTo: userId } });
        
        // Finally delete the user
        await User.destroy({ where: { id: userId }, force: true });

        res.status(200).json({ success: true, message: 'Account and all data deleted successfully' });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ message: 'Error deleting account' });
    }
};

module.exports = { login, registerUser, updateRoom, logout, getStaff, updateProfilePhoto, changePassword, forgotPassword, getAllUsers, toggleUserStatus, deleteAccount };
