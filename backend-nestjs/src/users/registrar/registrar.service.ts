import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegistrarService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    return { role: 'REGISTRAR', message: 'Registrar dashboard — coming in Sprint 2' };
  }
}
