import { IsUUID, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoriteSongDto {
  @ApiPropertyOptional({
    description: 'ID de la canción en la base de datos local (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Song ID must be a valid UUID' })
  songId?: string;

  @ApiPropertyOptional({
    description: 'ID del video del servicio externo',
    example: 'dQw4w9WgXcQ',
  })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiPropertyOptional({
    description: 'Título de la canción',
    example: 'Never Gonna Give You Up',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Nombre del artista',
    example: 'Rick Astley',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  artist?: string;

  @ApiPropertyOptional({
    description: 'URL del thumbnail',
    example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Duración en segundos',
    example: 212,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'URL del stream de audio',
    example: 'https://example.com/audio.mp3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  streamUrl?: string;
}
