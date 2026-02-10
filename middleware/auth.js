import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Hoster from '../models/Hoster.js';

export const authenticateAdmin = async (req, res, next) => {
  try {

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {

      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'superadmin') {

      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found or deactivated'
      });
    }
    
    req.user = { id: admin._id, role: 'admin', type: 'admin' };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

export const authenticateHoster = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'hoster') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    const hoster = await Hoster.findById(decoded.id);
    if (!hoster || !hoster.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Hoster not found or deactivated'
      });
    }
    
    if (hoster.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Hoster account is ${hoster.status}`
      });
    }
    
    req.user = { id: hoster._id, role: 'hoster', type: 'hoster' };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'user') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    req.user = { id: decoded.id, role: 'user', type: 'user' };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
  };
};