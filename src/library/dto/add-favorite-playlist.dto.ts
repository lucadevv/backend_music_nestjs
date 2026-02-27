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

  @ApiPropertyOptional({
    description: 'Nombre de la playlist (metadata opcional)',
    example: 'My Favorite Songs',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'URL del thumbnail de la playlist (metadata opcional)',
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la playlist (metadata opcional)',
    example: 'A collection of my favorite songs',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
