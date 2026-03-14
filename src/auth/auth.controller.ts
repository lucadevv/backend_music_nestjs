import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OAuthRequestDto } from './dto/oauth-request.dto';
import { OAuthResponseDto } from './dto/oauth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El usuario ya existe' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@CurrentUser() _user: unknown, @Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar autenticación con Google OAuth' })
  @ApiExcludeEndpoint()
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Req() req: Request) {
    return req.user;
  }

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth mobile login' })
  @ApiBody({ type: OAuthRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth login successful',
    type: OAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleOAuthLogin(@Body() oauthDto: OAuthRequestDto) {
    if (oauthDto.provider !== 'google') {
      throw new BadRequestException('Invalid OAuth provider');
    }

    if (!oauthDto.idToken && !oauthDto.accessToken) {
      throw new BadRequestException('ID token or access token is required for Google OAuth');
    }

    const { response, isNewUser } = await this.authService.loginWithGoogleMobile(
      oauthDto.idToken,
      oauthDto.accessToken,
      oauthDto.email,
      oauthDto.name,
    );

    return {
      ...response,
      isNewUser,
    };
  }

  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Iniciar autenticación con Apple Sign In' })
  @ApiExcludeEndpoint()
  async appleAuth() {
    // Initiates Apple Sign In flow
  }

  @Public()
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Callback de Apple Sign In' })
  @ApiExcludeEndpoint()
  async appleAuthCallback(@Req() req: Request) {
    return req.user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acceso usando refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token renovado exitosamente',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión y invalidar refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string', nullable: true },
        lastName: { type: 'string', nullable: true },
        avatar: { type: 'string', nullable: true },
        provider: { type: 'string' },
        role: { type: 'string' },
        isEmailVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId);
  }
}
