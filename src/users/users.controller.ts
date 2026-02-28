import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserSettingsDto, UserSettingsResponseDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/settings')
  @ApiOperation({ summary: 'Obtener configuración del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Configuración del usuario',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getSettings(@CurrentUser() user: any): Promise<UserSettingsResponseDto> {
    return this.usersService.getSettings(user.userId);
  }

  @Put('me/settings')
  @ApiOperation({ summary: 'Actualizar configuración del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async updateSettings(
    @CurrentUser() user: any,
    @Body() updateSettingsDto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.usersService.updateSettings(user.userId, updateSettingsDto);
  }
}
