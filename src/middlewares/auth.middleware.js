import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

export const requireJobseeker = (req, res, next) => {
  if (req.user && req.user.role === 'jobseeker') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Job seeker account required.',
  });
};

export const requireRecruiter = (req, res, next) => {
  if (req.user && req.user.role === 'recruiter') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Recruiter account required.',
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Administrator privileges required.',
  });
};