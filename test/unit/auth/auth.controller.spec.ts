import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { RegisterDto } from '../../../src/auth/dto/register.dto';
import { RefreshTokenDto } from '../../../src/auth/dto/refresh-token.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  mockUser,
  mockUserId,
  mockUserEmail,
  mockRefreshTokenValue,
} from '../../utils/mocks';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
    expiresIn: 900,
    user: {
      id: mockUserId,
      email: mockUserEmail,
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      role: 'user',
      isEmailVerified: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            loginWithGoogle: jest.fn(),
            loginWithApple: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // register
  // =====================
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register new user and return auth response', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw ConflictException when email exists', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.register(registerDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  // =====================
  // login
  // =====================
  describe('login', () => {
    const loginDto: LoginDto = {
      email: mockUserEmail,
      password: 'password123',
    };

    it('should login user and return auth response', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockUser, loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw UnauthorizedException when credentials invalid', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(mockUser, loginDto))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  // =====================
  // googleAuth
  // =====================
  describe('googleAuth', () => {
    it('should be defined', () => {
      expect(controller.googleAuth).toBeDefined();
    });
  });

  // =====================
  // googleAuthCallback
  // =====================
  describe('googleAuthCallback', () => {
    it('should return user from request', async () => {
      const mockReq = { user: mockAuthResponse } as any;

      const result = await controller.googleAuthCallback(mockReq);

      expect(result).toEqual(mockAuthResponse);
    });
  });

  // =====================
  // appleAuth
  // =====================
  describe('appleAuth', () => {
    it('should be defined', () => {
      expect(controller.appleAuth).toBeDefined();
    });
  });

  // =====================
  // appleAuthCallback
  // =====================
  describe('appleAuthCallback', () => {
    it('should return user from request', async () => {
      const mockReq = { user: mockAuthResponse } as any;

      const result = await controller.appleAuthCallback(mockReq);

      expect(result).toEqual(mockAuthResponse);
    });
  });

  // =====================
  // refresh
  // =====================
  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: mockRefreshTokenValue,
    };

    it('should refresh token and return new auth response', async () => {
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockRefreshTokenValue);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw UnauthorizedException when refresh token invalid', async () => {
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(controller.refresh(refreshTokenDto))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  // =====================
  // logout
  // =====================
  describe('logout', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: mockRefreshTokenValue,
    };

    it('should logout user successfully', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(refreshTokenDto);

      expect(authService.logout).toHaveBeenCalledWith(mockRefreshTokenValue);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // =====================
  // getProfile
  // =====================
  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUserPayload = {
        userId: mockUserId,
        email: mockUserEmail,
        role: 'user',
      };

      const result = await controller.getProfile(mockUserPayload);

      expect(authService.getProfile).toHaveBeenCalledWith(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        email: mockUserEmail,
        role: 'user',
      });
    });
  });
});
