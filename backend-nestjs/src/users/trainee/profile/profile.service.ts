import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PHOTO_BUCKET = 'trainee-photos';
type UploadedPhoto = { buffer: Buffer };

@Injectable()
export class ProfileService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.supabase = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.users.findFirst({
      where: { id: userId, role: 'TRAINEE' },
      select: {
        id: true,
        system_id: true,
        email: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        role: true,
        avatar_url: true,
        is_active: true,
        trainee: {
          select: {
            contact_number: true,
            street_address: true,
            barangay: true,
            municipality: true,
            district: true,
            province: true,
            gender: true,
            date_of_birth: true,
            place_of_birth: true,
            citizenship: true,
            mother_name: true,
            father_name: true,
            civil_status: true,
            highest_education: true,
            pwd: true,
            employment_status: true,
            employment_type: true,
          },
        },
      },
    });

    if (!profile?.trainee) {
      throw new NotFoundException('Trainee profile not found');
    }

    return {
      ...profile,
      trainee: {
        ...profile.trainee,
        date_of_birth: profile.trainee.date_of_birth.toISOString().slice(0, 10),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const trainee = await this.prisma.trainee.findFirst({
      where: { users_id: userId },
      select: { id: true },
    });

    if (!trainee) {
      throw new NotFoundException('Trainee profile not found');
    }

    await this.prisma.trainee.update({
      where: { id: trainee.id },
      data: {
        contact_number: dto.contactNumber.trim(),
        street_address: dto.streetAddress.trim(),
        barangay: dto.barangay.trim(),
        municipality: dto.municipality.trim(),
        district: dto.district.trim(),
        province: dto.province.trim(),
      },
    });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, role: 'TRAINEE' },
      select: { password_hash: true },
    });

    if (!user) {
      throw new NotFoundException('Trainee profile not found');
    }

    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different');
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: { password_hash: await bcrypt.hash(dto.newPassword, 12) },
    });

    return { message: 'Password updated successfully' };
  }

  async uploadPhoto(userId: string, file: UploadedPhoto) {
    if (!file) {
      throw new BadRequestException('A JPG or PNG photo is required');
    }

    const existing = await this.prisma.users.findFirst({
      where: { id: userId, role: 'TRAINEE' },
      select: { avatar_url: true },
    });
    if (!existing) {
      throw new NotFoundException('Trainee profile not found');
    }

    const image = await sharp(file.buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    const path = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await this.supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, image, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) {
      throw new InternalServerErrorException(
        `Photo upload failed: ${uploadError.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(path);
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { avatar_url: data.publicUrl },
      });
    } catch (error) {
      await this.supabase.storage.from(PHOTO_BUCKET).remove([path]);
      throw error;
    }

    const oldPath = this.storagePath(existing.avatar_url);
    if (oldPath && oldPath !== path) {
      const { error } = await this.supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);
      if (error) {
        throw new InternalServerErrorException(
          `Old photo cleanup failed: ${error.message}`,
        );
      }
    }

    return { avatarUrl: data.publicUrl };
  }

  private storagePath(url: string | null): string | null {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
    const index = url.indexOf(marker);
    return index >= 0
      ? decodeURIComponent(url.slice(index + marker.length))
      : null;
  }
}
