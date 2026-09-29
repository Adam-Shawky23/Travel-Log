const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new AppError('name, email, and password are required', 400);
    }
    if (password.length < 8) {
      throw new AppError('password must be at least 8 characters', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
