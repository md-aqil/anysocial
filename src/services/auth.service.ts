import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export class AuthService {
  private static JWT_EXPIRY = '7d';

  static async register(email: string, password: string, name?: string): Promise<AuthUser> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true
      }
    });

    return user;
  }

  static async login(email: string, password: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    };
  }

  static generateToken(user: AuthUser): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      env.TOKEN_ENCRYPTION_KEY,
      { expiresIn: this.JWT_EXPIRY }
    );
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, env.TOKEN_ENCRYPTION_KEY) as JWTPayload;
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    };
  }

  static async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<AuthUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true
      }
    });

    return user;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }
}