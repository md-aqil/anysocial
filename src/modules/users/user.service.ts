import { userRepository } from './user.repository.js';
import { logger } from '../../logger/pino.js';

export class UserService {
  async getUser(userId: string) {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getOrCreateUser(email: string) {
    const user = await userRepository.getOrCreate(email);
    
    logger.info({
      event: 'user_retrieved',
      userId: user.id,
      email: user.email
    });

    return user;
  }
}

export const userService = new UserService();
