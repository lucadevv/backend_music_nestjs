import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { User, AuthProvider, UserRole } from '../../../src/users/entities/user.entity';
import { mockUser, mockUserId, mockUserEmail, mockGoogleUser } from '../../utils/mocks';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // findById
  // =====================
  describe('findById', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockUserId);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // =====================
  // findByEmail
  // =====================
  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUserEmail);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUserEmail },
      });
    });

    it('should return null when user not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  // =====================
  // findByProvider
  // =====================
  describe('findByProvider', () => {
    it('should return user when found by provider', async () => {
      mockRepository.findOne.mockResolvedValue(mockGoogleUser);

      const result = await service.findByProvider(AuthProvider.GOOGLE, 'google-id-123');

      expect(result).toEqual(mockGoogleUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { provider: AuthProvider.GOOGLE, providerId: 'google-id-123' },
      });
    });

    it('should return null when user not found by provider', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByProvider(AuthProvider.GOOGLE, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should find user by Apple provider', async () => {
      const appleUser = { ...mockUser, provider: AuthProvider.APPLE, providerId: 'apple-id' };
      mockRepository.findOne.mockResolvedValue(appleUser);

      const result = await service.findByProvider(AuthProvider.APPLE, 'apple-id');

      expect(result).toEqual(appleUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { provider: AuthProvider.APPLE, providerId: 'apple-id' },
      });
    });
  });

  // =====================
  // create
  // =====================
  describe('create', () => {
    it('should create and return new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'hashedPassword',
        firstName: 'New',
        lastName: 'User',
        provider: AuthProvider.EMAIL,
      };

      const newUser = {
        id: 'new-user-id',
        ...userData,
        role: UserRole.USER,
        isActive: true,
        isEmailVerified: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(newUser as any);
      mockRepository.save.mockResolvedValue(newUser as any);

      const result = await service.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(newUser);
    });

    it('should create user with OAuth provider without password', async () => {
      const userData = {
        email: 'oauth@example.com',
        provider: AuthProvider.GOOGLE,
        providerId: 'google-123',
        firstName: 'OAuth',
        lastName: 'User',
      };

      const newUser = {
        id: 'oauth-user-id',
        ...userData,
        password: null,
        role: UserRole.USER,
        isActive: true,
        isEmailVerified: true,
      };

      mockRepository.create.mockReturnValue(newUser as any);
      mockRepository.save.mockResolvedValue(newUser as any);

      const result = await service.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(result.email).toBe(userData.email);
      expect(result.provider).toBe(AuthProvider.GOOGLE);
    });
  });

  // =====================
  // update
  // =====================
  describe('update', () => {
    it('should update and return user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(mockUserId, updateData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.firstName).toBe(updateData.firstName);
      expect(result.lastName).toBe(updateData.lastName);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { firstName: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should update provider info', async () => {
      const updateData = {
        provider: AuthProvider.GOOGLE,
        providerId: 'google-123',
        isEmailVerified: true,
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(mockUserId, updateData);

      expect(result.provider).toBe(AuthProvider.GOOGLE);
      expect(result.providerId).toBe('google-123');
      expect(result.isEmailVerified).toBe(true);
    });
  });

  // =====================
  // updateLastLogin
  // =====================
  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      mockRepository.update.mockResolvedValue({} as any);

      await service.updateLastLogin(mockUserId);

      expect(mockRepository.update).toHaveBeenCalledWith(mockUserId, {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  // =====================
  // verifyEmail
  // =====================
  describe('verifyEmail', () => {
    it('should set isEmailVerified to true', async () => {
      mockRepository.update.mockResolvedValue({} as any);

      await service.verifyEmail(mockUserId);

      expect(mockRepository.update).toHaveBeenCalledWith(mockUserId, {
        isEmailVerified: true,
      });
    });
  });
});
