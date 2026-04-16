import { prisma } from '../../db/prisma.js';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        socialAccounts: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async create(email: string) {
    return prisma.user.create({
      data: { email }
    });
  }

  async getOrCreate(email: string) {
    const existing = await this.findByEmail(email);
    if (existing) {
      return existing;
    }
    return this.create(email);
  }
}

export const userRepository = new UserRepository();
