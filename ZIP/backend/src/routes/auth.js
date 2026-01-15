const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { runQuery, getRow } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Generate JWT token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid input', error.details);
  }

  const { username, email, password } = value;

  // Check if user already exists
  const existingUser = await getRow(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [username, email || username]
  );

  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists',
      message: 'Username or email already taken'
    });
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  await runQuery(
    `INSERT INTO users (id, username, email, password_hash, role) 
     VALUES (?, ?, ?, ?, ?)`,
    [userId, username, email, passwordHash, 'user']
  );

  // Generate token
  const token = generateToken(userId);

  logger.info('User registered:', { userId, username, email });

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: userId,
      username,
      email,
      role: 'user'
    }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid input', error.details);
  }

  const { username, password } = value;

  // Get user
  const user = await getRow(
    'SELECT id, username, email, password_hash, role FROM users WHERE username = ?',
    [username]
  );

  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Username or password is incorrect'
    });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Username or password is incorrect'
    });
  }

  // Generate token
  const token = generateToken(user.id);

  // Update last login
  await runQuery(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  logger.info('User logged in:', { userId: user.id, username: user.username });

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getRow(
    `SELECT id, username, email, role, settings, created_at, updated_at 
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  // Parse settings JSON
  let settings = {};
  try {
    settings = JSON.parse(user.settings || '{}');
  } catch (error) {
    logger.warn('Failed to parse user settings:', { userId: user.id, error: error.message });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      settings,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  });
}));

// Update user profile
router.patch('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const updateSchema = Joi.object({
    email: Joi.string().email().optional(),
    settings: Joi.object().optional()
  });

  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid input', error.details);
  }

  const updates = [];
  const params = [];

  if (value.email) {
    // Check if email is already taken
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [value.email, req.user.id]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already taken',
        message: 'This email is already associated with another account'
      });
    }

    updates.push('email = ?');
    params.push(value.email);
  }

  if (value.settings) {
    updates.push('settings = ?');
    params.push(JSON.stringify(value.settings));
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No updates provided',
      message: 'Please provide fields to update'
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user.id);

  await runQuery(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info('User profile updated:', { userId: req.user.id, updates: Object.keys(value) });

  res.json({
    message: 'Profile updated successfully'
  });
}));

// Change password
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  });

  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid input', error.details);
  }

  const { currentPassword, newPassword } = value;

  // Get current password hash
  const user = await getRow(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User not found'
    });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Invalid password',
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await runQuery(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, req.user.id]
  );

  logger.info('Password changed:', { userId: req.user.id });

  res.json({
    message: 'Password changed successfully'
  });
}));

// Verify token (for frontend to check if token is still valid)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;