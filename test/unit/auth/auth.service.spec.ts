import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { UsersService } from '../../../src/users/users.service';
import { RefreshToken } from '../../../src/common/entities/refresh-token.entity';
import { User, AuthProvider, UserRole } from '../../../src/users/entities/user.entity';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import {
  mockUser,
  mockUserId,
  mockUserEmail,
  mockGoogleUser,
  mockAppleUser,
  mockInactiveUser,
  mockRefreshTokenValue,
  mockJwtPayload,
  mockGoogleProfile,
  mockAppleProfile,
} from '../../utils/mocks';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;

  const mockRefreshTokenRepo = {
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByProvider: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));

    // Default config values
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        'jwt.accessTokenExpiresIn': '15m',
        'jwt.refreshTokenExpiresIn': '7d',
        'jwt.secret': 'test-secret',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // validateUser
  // =====================
  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(mockUserEmail, 'password123');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith(mockUserEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('should return null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(mockUserEmail, 'wrongpassword');

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
    });

    it('should return null when user has no password (OAuth user)', async () => {
      const oauthUser = { ...mockUser, password: null };
      usersService.findByEmail.mockResolvedValue(oauthUser);

      const result = await service.validateUser(mockUserEmail, 'password123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(mockInactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser(mockInactiveUser.email, 'password123'))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  // =====================
  // register
  // =====================
  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create new user with hashed password and return tokens', async () => {
      const newUser = {
        ...mockUser,
        id: 'new-user-id',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      };

      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usersService.create.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashedPassword123',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        provider: AuthProvider.EMAIL,
        isEmailVerified: false,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto))
        .rejects
        .toThrow(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  // =====================
  // login
  // =====================
  describe('login', () => {
    const loginDto = {
      email: mockUserEmail,
      password: 'password123',
    };

    it('should return tokens when credentials are valid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto))
        .rejects
        .toThrow(UnauthorizedException);

      expect(usersService.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  // =====================
  // loginWithGoogle
  // =====================
  describe('loginWithGoogle', () => {
    it('should create new user when Google user does not exist', async () => {
      const newUser = { ...mockGoogleUser, id: 'new-google-user' };
      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(newUser);
      usersService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.loginWithGoogle(mockGoogleProfile);

      expect(usersService.create).toHaveBeenCalledWith({
        email: mockGoogleProfile.emails[0].value,
        provider: AuthProvider.GOOGLE,
        providerId: mockGoogleProfile.id,
        firstName: mockGoogleProfile.name?.givenName,
        lastName: mockGoogleProfile.name?.familyName,
        avatar: mockGoogleProfile.photos?.[0]?.value,
        isEmailVerified: true,
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should link Google account to existing user', async () => {
      const existingUser = { ...mockUser, id: 'existing-id' };
      const updatedUser = { ...existingUser, provider: AuthProvider.GOOGLE, providerId: mockGoogleProfile.id };
      
      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(existingUser);
      usersService.update.mockResolvedValue(updatedUser);
      usersService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      await service.loginWithGoogle(mockGoogleProfile);

      expect(usersService.update).toHaveBeenCalledWith(existingUser.id, {
        provider: AuthProvider.GOOGLE,
        providerId: mockGoogleProfile.id,
        isEmailVerified: true,
      });
    });

    it('should update existing Google user info', async () => {
      usersService.findByProvider.mockResolvedValue(mockGoogleUser);
      usersService.update.mockResolvedValue(mockGoogleUser);
      usersService.findById.mockResolvedValue(mockGoogleUser);
      usersService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.loginWithGoogle(mockGoogleProfile);

      expect(usersService.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw BadRequestException when profile missing email', async () => {
      const profileWithoutEmail = { ...mockGoogleProfile, emails: [] };

      await expect(service.loginWithGoogle(profileWithoutEmail))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      usersService.findByProvider.mockResolvedValue(mockInactiveUser);
      usersService.update.mockResolvedValue(mockInactiveUser);
      usersService.findById.mockResolvedValue(mockInactiveUser);

      await expect(service.loginWithGoogle(mockGoogleProfile))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  // =====================
  // loginWithApple
  // =====================
  describe('loginWithApple', () => {
    it('should create new user when Apple user does not exist', async () => {
      const newUser = { ...mockAppleUser, id: 'new-apple-user' };
      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(newUser);
      usersService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.loginWithApple(mockAppleProfile);

      expect(usersService.create).toHaveBeenCalledWith({
        email: mockAppleProfile.email,
        provider: AuthProvider.APPLE,
        providerId: mockAppleProfile.id,
        firstName: mockAppleProfile.name?.firstName,
        lastName: mockAppleProfile.name?.lastName,
        isEmailVerified: true,
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw BadRequestException when profile missing email', async () => {
      const profileWithoutEmail = { ...mockAppleProfile, email: undefined };

      await expect(service.loginWithApple(profileWithoutEmail))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  // =====================
  // refreshToken
  // =====================
  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const mockTokenRecord = {
        id: 'token-id',
        userId: mockUserId,
        token: 'hashedToken',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      mockRefreshTokenRepo.findOne.mockResolvedValue(mockTokenRecord);
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('newAccessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      mockRefreshTokenRepo.delete.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.refreshToken(mockRefreshTokenValue);

      expect(result).toHaveProperty('accessToken');
      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledWith(mockTokenRecord.id);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('invalidToken'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockTokenRecord = {
        id: 'token-id',
        userId: mockUserId,
        token: 'hashedToken',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: null,
      };

      mockRefreshTokenRepo.findOne.mockResolvedValue(mockTokenRecord);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(mockRefreshTokenValue))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const mockTokenRecord = {
        id: 'token-id',
        userId: mockUserId,
        token: 'hashedToken',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockInactiveUser,
      };

      mockRefreshTokenRepo.findOne.mockResolvedValue(mockTokenRecord);
      usersService.findById.mockResolvedValue(mockInactiveUser);

      await expect(service.refreshToken(mockRefreshTokenValue))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  // =====================
  // logout
  // =====================
  describe('logout', () => {
    it('should delete refresh token when found', async () => {
      const mockTokenRecord = {
        id: 'token-id',
        userId: mockUserId,
        token: 'hashedToken',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockRefreshTokenRepo.findOne.mockResolvedValue(mockTokenRecord);
      mockRefreshTokenRepo.delete.mockResolvedValue({});

      await service.logout(mockRefreshTokenValue);

      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledWith(mockTokenRecord.id);
    });

    it('should not throw error when refresh token not found', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.logout('nonexistentToken')).resolves.not.toThrow();
      expect(mockRefreshTokenRepo.delete).not.toHaveBeenCalled();
    });
  });

  // =====================
  // parseExpiresIn (private method - tested indirectly)
  // =====================
  describe('parseExpiresIn (via generateTokens)', () => {
    it('should correctly parse seconds', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('30s');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.expiresIn).toBe(30);
    });

    it('should correctly parse minutes', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('15m');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.expiresIn).toBe(900); // 15 * 60
    });

    it('should correctly parse hours', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('1h');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.expiresIn).toBe(3600); // 1 * 3600
    });

    it('should correctly parse days', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('7d');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.expiresIn).toBe(604800); // 7 * 86400
    });

    it('should return default 900 when format is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('accessToken');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      configService.get.mockReturnValue('invalid');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.expiresIn).toBe(900); // Default
    });
  });
});
