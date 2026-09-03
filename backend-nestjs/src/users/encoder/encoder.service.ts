import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EncoderService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    return { role: 'ENCODER', message: 'Encoder dashboard — coming in Sprint 2' };
  }
}
