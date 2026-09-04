import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if your PrismaService is located elsewhere

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async getExpirations() {
    return this.prisma.sessions.findMany({
      select: {
        expires: true,
      },
    });
  }
}