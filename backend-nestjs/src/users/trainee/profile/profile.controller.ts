import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
type UploadedPhoto = { buffer: Buffer };

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const allowedPhotoTypes = new Set(['image/jpeg', 'image/png']);

@Controller('trainee/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINEE)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, dto);
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!allowedPhotoTypes.has(file.mimetype)) {
          callback(
            new BadRequestException('Only JPG and PNG photos are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_PHOTO_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: UploadedPhoto,
  ) {
    return this.profileService.uploadPhoto(user.id, file);
  }
}
