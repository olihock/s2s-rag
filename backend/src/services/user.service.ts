import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { User, SupportedLanguage } from '../types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      preferredLanguage: user.preferredLanguage as SupportedLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      preferredLanguage: user.preferredLanguage as SupportedLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updatePreferredLanguage(id: string, language: SupportedLanguage): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { preferredLanguage: language },
    });
    return {
      id: user.id,
      email: user.email,
      preferredLanguage: user.preferredLanguage as SupportedLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
