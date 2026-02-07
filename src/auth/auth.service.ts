import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User account is inactive');
        }

        return user;
    }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const user = await this.usersService.create({
            email: registerDto.email,
            password: hashedPassword,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            provider: AuthProvider.EMAIL,
            isEmailVerified: false,
        });

        return this.generateTokens(user);
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.usersService.updateLastLogin(user.id);

        return this.generateTokens(user);
    }

    async loginWithGoogle(profile: {
        id: string;
        emails: Array<{ value: string; verified?: boolean }>;
        name?: { givenName?: string; familyName?: string };
        photos?: Array<{ value: string }>;
    }): Promise<AuthResponseDto> {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            throw new BadRequestException('Google profile missing email');
        }

        let user = await this.usersService.findByProvider(
            AuthProvider.GOOGLE,
            profile.id,
        );

        if (!user) {
            // Check if user exists with this email
            const existingUser = await this.usersService.findByEmail(email);
            if (existingUser) {
                // Link Google account to existing user
                user = await this.usersService.update(existingUser.id, {
                    provider: AuthProvider.GOOGLE,
                    providerId: profile.id,
                    isEmailVerified: profile.emails[0]?.verified || true,
                });
            } else {
                // Create new user
                user = await this.usersService.create({
                    email,
                    provider: AuthProvider.GOOGLE,
                    providerId: profile.id,
                    firstName: profile.name?.givenName,
                    lastName: profile.name?.familyName,
                    avatar: profile.photos?.[0]?.value,
                    isEmailVerified: profile.emails[0]?.verified || true,
                });
            }
        } else {
            // Update user info
            await this.usersService.update(user.id, {
                firstName: profile.name?.givenName || user.firstName,
                lastName: profile.name?.familyName || user.lastName,
                avatar: profile.photos?.[0]?.value || user.avatar,
                isEmailVerified: profile.emails[0]?.verified || user.isEmailVerified,
            });
            user = await this.usersService.findById(user.id);
        }

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User account is inactive');
        }

        await this.usersService.updateLastLogin(user.id!);

        return this.generateTokens(user!);
    }

    async loginWithApple(profile: {
        id: string;
        email?: string;
        name?: { firstName?: string; lastName?: string };
    }): Promise<AuthResponseDto> {
        if (!profile.email) {
            throw new BadRequestException('Apple profile missing email');
        }

        let user = await this.usersService.findByProvider(
            AuthProvider.APPLE,
            profile.id,
        );

        if (!user) {
            // Check if user exists with this email
            const existingUser = await this.usersService.findByEmail(profile.email);
            if (existingUser) {
                // Link Apple account to existing user
                user = await this.usersService.update(existingUser.id, {
                    provider: AuthProvider.APPLE,
                    providerId: profile.id,
                    isEmailVerified: true,
                });
            } else {
                // Create new user
                user = await this.usersService.create({
                    email: profile.email,
                    provider: AuthProvider.APPLE,
                    providerId: profile.id,
                    firstName: profile.name?.firstName,
                    lastName: profile.name?.lastName,
                    isEmailVerified: true,
                });
            }
        } else {
            // Update user info
            await this.usersService.update(user.id, {
                firstName: profile.name?.firstName || user.firstName,
                lastName: profile.name?.lastName || user.lastName,
                isEmailVerified: true,
            });
            user = await this.usersService.findById(user.id);
        }

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User account is inactive');
        }

        await this.usersService.updateLastLogin(user.id!);

        return this.generateTokens(user!);
    }

    async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
        const tokenRecord = await this.findRefreshToken(refreshToken);
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.usersService.findById(tokenRecord.userId);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        // Delete old refresh token
        await this.refreshTokenRepository.delete(tokenRecord.id);

        return this.generateTokens(user);
    }

    async logout(refreshToken: string): Promise<void> {
        const tokenRecord = await this.findRefreshToken(refreshToken);
        if (tokenRecord) {
            await this.refreshTokenRepository.delete(tokenRecord.id);
        }
    }

    private async generateTokens(user: User): Promise<AuthResponseDto> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = await this.createRefreshToken(user.id);

        const expiresIn = this.configService.get<string>('jwt.accessTokenExpiresIn') || '15m';
        const expiresInSeconds = this.parseExpiresIn(expiresIn);

        return {
            accessToken,
            refreshToken,
            expiresIn: expiresInSeconds,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
            },
        };
    }

    private async createRefreshToken(userId: string): Promise<string> {
        const token = randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(token, 10);

        const expiresIn = this.configService.get<string>(
            'jwt.refreshTokenExpiresIn',
        ) || '7d';
        const expiresAt = this.calculateExpirationDate(expiresIn);

        await this.refreshTokenRepository.save({
            userId,
            token: hashedToken,
            expiresAt,
        });

        return token;
    }

    private async findRefreshToken(token: string): Promise<RefreshToken | null> {
        // Get all tokens that haven't expired
        const tokens = await this.refreshTokenRepository
            .createQueryBuilder('refreshToken')
            .where('refreshToken.expiresAt > :now', { now: new Date() })
            .getMany();

        for (const tokenRecord of tokens) {
            const isValid = await bcrypt.compare(token, tokenRecord.token);
            if (isValid) {
                return tokenRecord;
            }
        }

        return null;
    }

    private parseExpiresIn(expiresIn: string): number {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) return 900; // Default 15 minutes

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                return 900;
        }
    }

    private calculateExpirationDate(expiresIn: string): Date {
        const seconds = this.parseExpiresIn(expiresIn);
        return new Date(Date.now() + seconds * 1000);
    }
}
