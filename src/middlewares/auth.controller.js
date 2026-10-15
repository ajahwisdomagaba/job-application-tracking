import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createHash } from 'node:crypto';
import { createEmailConfirmationToken } from '../utils/emailConfirmation.js';
import { sendEmailConfirmation } from '../services/email.service.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',});
};

const EMAIL_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const issueEmailConfirmation = async (user) => {
    const { token, tokenHash } = createEmailConfirmationToken();
    user.emailConfirmationTokenHash = tokenHash;
    user.emailConfirmationExpires = new Date(Date.now() + EMAIL_CONFIRMATION_TTL_MS);
    await user.save();
    await sendEmailConfirmation({ email: user.email, name: user.name, token });
};

//@desc Register a job seeker or recruiter
//@route POST /api/v1/auth/register
//@access Public
export const register = async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = req.body.password;
        const requestedRole = req.body.role || 'jobseeker';
        const companyName = String(req.body.companyName || '').trim();

        if (!name || !email || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }
        // Public registration must never grant administrator privileges.
        if (!['jobseeker', 'recruiter'].includes(requestedRole)) {
            return res.status(400).json({ success: false, message: 'Role must be jobseeker or recruiter.' });
        }
        if (requestedRole === 'recruiter' && !companyName) {
            return res.status(400).json({ success: false, message: 'Company name is required for recruiter accounts.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        const user = new User({
            name,
            email,
            password,
            role: requestedRole,
            ...(requestedRole === 'recruiter' ? { companyName, verificationStatus: 'pending' } : {}),
            isEmailConfirmed: false,
        });

        // The User model's pre-save hook hashes the password.
        await user.save();
        try {
            await issueEmailConfirmation(user);
        } catch (emailError) {
            // Do not expose SMTP details. The user can request a resend after configuration is fixed.
            console.error('Registration confirmation email could not be sent.');
            return res.status(503).json({
                success: false,
                message: 'Your account was created, but we could not send the confirmation email. Please try resending it later.',
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Registration successful. Check your email to confirm your account before logging in.',
            data: { _id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        next(error);
    }
};

//@desc Confirm email address using a single-use token
//@route GET /api/v1/auth/confirm-email?token=...
//@access Public
export const confirmEmail = async (req, res, next) => {
    try {
        const token = String(req.query.token || '').trim();
        if (!token || token.length > 512) {
            return res.status(400).json({ success: false, message: 'A valid confirmation token is required.' });
        }

        const tokenHash = createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            emailConfirmationTokenHash: tokenHash,
            emailConfirmationExpires: { $gt: new Date() },
        }).select('+emailConfirmationTokenHash +emailConfirmationExpires');

        if (!user) {
            return res.status(400).json({ success: false, message: 'This confirmation link is invalid or has expired. Request a new one.' });
        }

        user.isEmailConfirmed = true;
        user.emailConfirmationTokenHash = undefined;
        user.emailConfirmationExpires = undefined;
        await user.save();

        return res.status(200).json({ success: true, message: 'Email confirmed successfully. You can now log in.' });
    } catch (error) {
        next(error);
    }
};

//@desc Resend email confirmation
//@route POST /api/v1/auth/resend-confirmation
//@access Public
export const resendConfirmation = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const genericResponse = {
            success: true,
            message: 'If an unconfirmed account exists for that email, a confirmation message will be sent.',
        };
        const user = await User.findOne({ email });
        if (!user || user.isEmailConfirmed) {
            return res.status(200).json(genericResponse);
        }

        try {
            await issueEmailConfirmation(user);
        } catch (emailError) {
            console.error('Resend confirmation email could not be sent.');
            return res.status(503).json({ success: false, message: 'We could not send the confirmation email. Please try again later.' });
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        next(error);
    }
};

//@desc Login user
//@route POST /api/v1/auth/login
//@access Public


export const login = async (req, res, next) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);
        if (!email || !password){
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !(await user.comparePassword(password))){
            return res.status(401).json({ success: false, message: 'Invalid emails or password' });
        }

        //must confirm email before loggin in
        if (!user.isEmailConfirmed){
            return res.status(403).json({
                success: false,
                message: 'Please confirm your email address before logging in.'
            })
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                ...(user.companyName && { companyName: user.companyName }),
                ...(user.verificationStatus && { verificationStatus: user.verificationStatus }),
                token,
            },
        });
    } catch (error) {
        next(error);
    }
}

//desc Get logged in user
//@route GET /api/v1/auth/me
//@access Private

export const getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'User data fetched successfully',
            data: req.user,
        });
    } catch (error) {
        next(error);
    }
}

//desc update user profile
//@route PUT /api/v1/auth/update-profile
//@access Private

export const updateMe = async (req, res, next) => {
    try {
        const allowedUpdates = ['name'];
        if (req.user.role === 'recruiter'){
            allowedUpdates.push('companyName');
        }

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)){
                updates[key] = req.body[key];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { 
            new: true, 
            runValidators: true }).select('-password');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
}