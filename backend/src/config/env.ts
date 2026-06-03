import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5501;
export const JWT_SECRET = process.env.JWT_SECRET || 'dalang-erp-secret-key-2026';
