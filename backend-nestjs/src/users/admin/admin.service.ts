import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Sprint 2+ — admin-specific logic goes here
  async getDashboardStats() {
    const [totalUsers, totalPrograms, totalBatches] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.programs.count(),
      this.prisma.batch.count(),
    ]);

    return { totalUsers, totalPrograms, totalBatches };
  }
}
