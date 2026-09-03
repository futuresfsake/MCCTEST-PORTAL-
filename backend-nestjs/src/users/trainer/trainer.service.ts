import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrainerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    return { role: 'TRAINER', message: 'Trainer dashboard — coming in Sprint 2' };
  }
}
