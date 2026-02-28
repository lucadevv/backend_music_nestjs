import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuthProvider } from './entities/user.entity';
import { UpdateUserSettingsDto, UserSettingsResponseDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { provider, providerId },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      isEmailVerified: true,
    });
  }

  // Settings methods
  async getSettings(userId: string): Promise<UserSettingsResponseDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return {
      language: user.language || 'en',
      streamingQuality: user.streamingQuality || 'high',
      downloadQuality: user.downloadQuality || 'high',
      autoPlay: user.autoPlay ?? true,
      showLyrics: user.showLyrics ?? false,
      equalizerPreset: user.equalizerPreset || 'flat',
    };
  }

  async updateSettings(userId: string, settings: UpdateUserSettingsDto): Promise<UserSettingsResponseDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Update only the provided settings
    if (settings.language !== undefined) user.language = settings.language;
    if (settings.streamingQuality !== undefined) user.streamingQuality = settings.streamingQuality;
    if (settings.downloadQuality !== undefined) user.downloadQuality = settings.downloadQuality;
    if (settings.autoPlay !== undefined) user.autoPlay = settings.autoPlay;
    if (settings.showLyrics !== undefined) user.showLyrics = settings.showLyrics;
    if (settings.equalizerPreset !== undefined) user.equalizerPreset = settings.equalizerPreset;

    await this.userRepository.save(user);

    return this.getSettings(userId);
  }
}
