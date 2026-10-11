import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',});
};

//@desc Login user
//@route POST /api/v1/auth/login
//@access Public


export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password){
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !(await user.comparePassword(password))){
            return res.status(401).json({ success: false, message: 'Invalid emails oe password' });
        }

        //must confirm email before loggin in
        if (!user.isEmailConfirmed){
            return res.status(403).json({
                success: false,
                message: 'Your email address is not conformed Pleasehek your inbox'
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