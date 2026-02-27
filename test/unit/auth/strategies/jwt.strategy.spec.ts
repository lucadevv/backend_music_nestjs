import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../../../src/auth/strategies/jwt.strategy';
import { UsersService } from '../../../../src/users/users.service';
import { mockUser, mockInactiveUser, mockJwtPayload } from '../../../utils/mocks';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'jwt.secret': 'test-secret-key',
                'jwt.issuer': 'music_app',
                'jwt.audience': 'music_app',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // validate
  // =====================
  describe('validate', () => {
    it('should return user payload when user is found and active', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockJwtPayload);

      expect(usersService.findById).toHaveBeenCalledWith(mockJwtPayload.sub);
      expect(result).toEqual({
        userId: mockJwtPayload.sub,
        email: mockJwtPayload.email,
        role: mockJwtPayload.role,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(strategy.validate(mockJwtPayload))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(strategy.validate(mockJwtPayload))
        .rejects
        .toThrow('User not found or inactive');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      usersService.findById.mockResolvedValue(mockInactiveUser);

      await expect(strategy.validate(mockJwtPayload))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(strategy.validate(mockJwtPayload))
        .rejects
        .toThrow('User not found or inactive');
    });

    it('should call findById with correct user id from payload', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      await strategy.validate(mockJwtPayload);

      expect(usersService.findById).toHaveBeenCalledWith(mockJwtPayload.sub);
    });
  });

  // =====================
  // Configuration
  // =====================
  describe('configuration', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should use JWT secret from config', () => {
      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
    });

    it('should use issuer from config', () => {
      expect(configService.get).toHaveBeenCalledWith('jwt.issuer');
    });

    it('should use audience from config', () => {
      expect(configService.get).toHaveBeenCalledWith('jwt.audience');
    });
  });
});
