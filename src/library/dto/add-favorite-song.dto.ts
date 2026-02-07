import { IsUUID, IsOptional, IsString } from 'class-validator';
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
  videoId?: string; // ID del servicio externo
}
