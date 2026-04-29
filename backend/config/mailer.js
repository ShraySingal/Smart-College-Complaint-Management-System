const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendWelcomeEmail = async (user, plainPassword) => {
    const registrationDate = new Date().toLocaleString();
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #fff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2563EB; margin-bottom: 5px;">Welcome to NovaTech!</h2>
                <p style="color: #64748b; margin-top: 0;">Your account has been successfully created.</p>
            </div>
            
            <p>Hello <b>${user.name}</b>,</p>
            <p>Welcome to the College Smart Complaint System. Below are your account details for future reference:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0;"><strong>Registration Date:</strong> ${registrationDate}</p>
                <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> ${user.email}</p>
                <p style="margin: 0;"><strong>Password:</strong> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 3px;">${plainPassword}</code></p>
            </div>

            <p style="color: #475569; font-size: 0.9rem;"><i>Note: We recommend changing your password after your first login for better security.</i></p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:5010/login.html" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Login to Dashboard</a>
            </div>
            
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;">
            <p style="text-align: center; color: #94a3b8; font-size: 0.8rem;">
                © 2024 NovaTech Complaint System | Automated Registration Mail
            </p>
        </div>
    `;
    await sendEmail(user.email, 'Welcome to NovaTech - Your Account Details', '', html);
};

const sendResolutionEmail = async (user, complaint) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #059669;">Complaint Resolved</h2>
            <p>Hello <b>${user.name}</b>,</p>
            <p>Your complaint titled "<b>${complaint.title}</b>" has been marked as <b>RESOLVED</b>.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><b>Resolution Date & Time:</b> ${new Date(complaint.updatedAt).toLocaleString()}</p>
                <p><b>Resolution Summary:</b></p>
                <p>${complaint.resolutionSummary}</p>
                ${complaint.resolutionAttachment ? `
                    <p><b>Resolution Evidence:</b></p>
                    <div style="margin-top: 10px;">
                        <a href="${complaint.resolutionAttachment}" style="color: #2563EB; text-decoration: none; font-weight: 600;">View Attachment</a>
                    </div>
                ` : ''}
            </div>
            <p>Please log in to provide your feedback on the resolution.</p>
            <hr style="margin: 20px 0;">
            <p><small>© 2024 NovaTech Complaint System</small></p>
        </div>
    `;
    await sendEmail(user.email, `Resolution: ${complaint.title}`, '', html);
};

const sendComplaintAcknowledgeEmail = async (user, complaint) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2563EB;">Complaint Received</h2>
            <p>Hello <b>${user.name}</b>,</p>
            <p>Your complaint "<b>${complaint.title}</b>" has been successfully registered.</p>
            <p><b>Ticket ID:</b> ${complaint.id}</p>
            <p><b>Priority:</b> ${complaint.priority}</p>
            <p><b>Expected Resolution:</b> ${new Date(complaint.deadline).toLocaleDateString()}</p>
            <p>Our team will look into it shortly.</p>
            <hr style="margin: 20px 0;">
            <p><small>© 2024 NovaTech Complaint System</small></p>
        </div>
    `;
    await sendEmail(user.email, `Complaint Registered: ${complaint.title}`, '', html);
};

const sendAdminNotificationEmail = async (admin, user, complaint) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #DC2626;">New ${complaint.priority} Priority Complaint</h2>
            <p>A new complaint has been raised by <b>${user.name}</b> (${user.department}).</p>
            <p><b>Title:</b> ${complaint.title}</p>
            <p><b>Category:</b> ${complaint.category}</p>
            <p><b>Date & Time:</b> ${new Date(complaint.createdAt).toLocaleString()}</p>
            <p><b>Description:</b> ${complaint.description}</p>
            <div style="margin-top: 20px;">
                <a href="http://localhost:5010/admin.html" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
            </div>
            <hr style="margin: 20px 0;">
            <p><small>© 2024 NovaTech Complaint System</small></p>
        </div>
    `;
    await sendEmail(admin.email, `New Complaint Alert: ${complaint.title}`, '', html);
};

const sendEmail = async (to, subject, text, htmlContent) => {
    try {
        await transporter.sendMail({
            from: `"College Complaint System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: htmlContent || `<h3>${subject}</h3><p>${text}</p>`
        });
    } catch (error) {
        console.error("Email sending failed:", error);
    }
};

module.exports = { sendEmail, sendWelcomeEmail, sendResolutionEmail, sendComplaintAcknowledgeEmail, sendAdminNotificationEmail };
