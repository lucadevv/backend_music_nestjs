import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoritePlaylistDto {
  @ApiPropertyOptional({
    description: 'ID de la playlist en la base de datos local (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Playlist ID must be a valid UUID' })
  playlistId?: string;

  @ApiPropertyOptional({
    description: 'ID de la playlist del servicio externo',
    example: 'PLrAlY9YP5Npyf2smWvULRgb2s4whfQoQM',
  })
  @IsOptional()
  @IsString()
  externalPlaylistId?: string; // playlistId del servicio externo
}
