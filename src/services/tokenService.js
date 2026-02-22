import jwt from 'jsonwebtoken';

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Verify token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Decode token without verification
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};