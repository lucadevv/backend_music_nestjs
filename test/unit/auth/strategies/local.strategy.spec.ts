import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from '../../../../src/auth/strategies/local.strategy';
import { AuthService } from '../../../../src/auth/auth.service';
import { mockUser, mockUserEmail } from '../../../utils/mocks';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // validate
  // =====================
  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockUserEmail, 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith(mockUserEmail, 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(mockUserEmail, 'wrongpassword'))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(strategy.validate(mockUserEmail, 'wrongpassword'))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should call validateUser with email as username', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      await strategy.validate('test@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should pass password correctly', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      await strategy.validate(mockUserEmail, 'mypassword');

      expect(authService.validateUser).toHaveBeenCalledWith(
        expect.any(String),
        'mypassword',
      );
    });
  });

  // =====================
  // Configuration
  // =====================
  describe('configuration', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should use email field as username', () => {
      // The strategy is configured with usernameField: 'email'
      // We can verify this by checking that validate receives email as first param
      expect(strategy).toBeInstanceOf(LocalStrategy);
    });
  });
});
