import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoriteGenreDto {
  @ApiPropertyOptional({
    description: 'ID del género en la base de datos local (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Genre ID must be a valid UUID' })
  genreId?: string;

  @ApiPropertyOptional({
    description: 'Parámetros del género del servicio externo',
    example: 'rock',
  })
  @IsOptional()
  @IsString()
  externalParams?: string; // params del servicio externo
}
