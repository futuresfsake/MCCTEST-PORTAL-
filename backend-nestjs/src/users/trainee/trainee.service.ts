import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TraineeService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    return { role: 'TRAINEE', message: 'Trainee dashboard — coming in Sprint 2' };
  }
}
