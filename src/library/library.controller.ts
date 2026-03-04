import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { LibraryService } from './library.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddFavoriteSongDto } from './dto/add-favorite-song.dto';
import { AddFavoritePlaylistDto } from './dto/add-favorite-playlist.dto';
import { AddFavoriteGenreDto } from './dto/add-favorite-genre.dto';

@ApiTags('library')
@ApiBearerAuth('JWT-auth')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('songs')
  @ApiOperation({
    summary: 'Agregar canción a favoritos',
    description:
      'Puede agregar por songId (local) o videoId (servicio externo). Si usa videoId, se sincronizará automáticamente.',
  })
  @ApiBody({ type: AddFavoriteSongDto })
  @ApiResponse({
    status: 201,
    description: 'Canción agregada a favoritos exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Canción no encontrada' })
  @ApiResponse({ status: 409, description: 'La canción ya está en favoritos' })
  async addFavoriteSong(
    @CurrentUser() user: any,
    @Body() dto: AddFavoriteSongDto,
  ) {
    return this.libraryService.addFavoriteSong(
      user.userId,
      dto.songId,
      dto.videoId,
      dto.title || dto.artist || dto.thumbnail ? {
        title: dto.title,
        artist: dto.artist,
        thumbnail: dto.thumbnail,
        duration: dto.duration,
      } : undefined,
    );
  }

  @Delete('songs/:songId')
  @ApiOperation({ 
    summary: 'Eliminar canción de favoritos',
    description: 'Puede usar el songId (UUID) o el videoId del servicio externo',
  })
  @ApiParam({ name: 'songId', description: 'ID de la canción (UUID) o videoId' })
  @ApiResponse({
    status: 200,
    description: 'Canción eliminada de favoritos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Canción no está en favoritos' })
  async removeFavoriteSong(
    @CurrentUser() user: any,
    @Param('songId') songId: string,
  ) {
    await this.libraryService.removeFavoriteSong(user.userId, songId);
    return { message: 'Song removed from favorites' };
  }

  @Get('songs')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Obtener canciones favoritas del usuario' })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Elementos por página',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Canciones favoritas obtenidas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getFavoriteSongs(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.libraryService.getFavoriteSongs(user.userId, page, limit);
  }

  @Get('songs/:songId/check')
  @ApiOperation({ summary: 'Verificar si una canción está en favoritos' })
  @ApiParam({ name: 'songId', description: 'ID de la canción' })
  @ApiResponse({
    status: 200,
    description: 'Estado de favorito obtenido',
    schema: {
      type: 'object',
      properties: {
        isFavorite: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async checkSongFavorite(
    @CurrentUser() user: any,
    @Param('songId') songId: string,
  ) {
    const isFavorite = await this.libraryService.isSongFavorite(
      user.userId,
      songId,
    );
    return { isFavorite };
  }

  @Post('playlists')
  @ApiOperation({
    summary: 'Agregar playlist a favoritos',
    description:
      'Puede agregar por playlistId (local) o externalPlaylistId (servicio externo). Si usa externalPlaylistId, se sincronizará automáticamente.',
  })
  @ApiBody({ type: AddFavoritePlaylistDto })
  @ApiResponse({
    status: 201,
    description: 'Playlist agregada a favoritos exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  @ApiResponse({ status: 409, description: 'La playlist ya está en favoritos' })
  async addFavoritePlaylist(
    @CurrentUser() user: any,
    @Body() dto: AddFavoritePlaylistDto,
  ) {
    return this.libraryService.addFavoritePlaylist(
      user.userId,
      dto.playlistId,
      dto.externalPlaylistId,
      dto.name || dto.thumbnail || dto.description || dto.trackCount ? {
        name: dto.name,
        thumbnail: dto.thumbnail,
        description: dto.description,
        trackCount: dto.trackCount,
      } : undefined,
    );
  }

  @Delete('playlists/:playlistId')
  @ApiOperation({ 
    summary: 'Eliminar playlist de favoritos',
    description: 'Puede usar el playlistId (UUID) o el externalPlaylistId del servicio externo',
  })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist (UUID) o externalPlaylistId' })
  @ApiResponse({
    status: 200,
    description: 'Playlist eliminada de favoritos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no está en favoritos' })
  async removeFavoritePlaylist(
    @CurrentUser() user: any,
    @Param('playlistId') playlistId: string,
  ) {
    await this.libraryService.removeFavoritePlaylist(user.userId, playlistId);
    return { message: 'Playlist removed from favorites' };
  }

  @Get('playlists')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Obtener playlists favoritas del usuario' })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Elementos por página',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Playlists favoritas obtenidas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getFavoritePlaylists(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.libraryService.getFavoritePlaylists(user.userId, page, limit);
  }

  @Get('playlists/:playlistId/check')
  @ApiOperation({ summary: 'Verificar si una playlist está en favoritos' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiResponse({
    status: 200,
    description: 'Estado de favorito obtenido',
    schema: {
      type: 'object',
      properties: {
        isFavorite: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async checkPlaylistFavorite(
    @CurrentUser() user: any,
    @Param('playlistId') playlistId: string,
  ) {
    const isFavorite = await this.libraryService.isPlaylistFavorite(
      user.userId,
      playlistId,
    );
    return { isFavorite };
  }

  @Post('genres')
  @ApiOperation({
    summary: 'Agregar género a favoritos',
    description:
      'Puede agregar por genreId (local) o externalParams (servicio externo). Si usa externalParams, se sincronizará automáticamente.',
  })
  @ApiBody({ type: AddFavoriteGenreDto })
  @ApiResponse({
    status: 201,
    description: 'Género agregado a favoritos exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Género no encontrado' })
  @ApiResponse({ status: 409, description: 'El género ya está en favoritos' })
  async addFavoriteGenre(
    @CurrentUser() user: any,
    @Body() dto: AddFavoriteGenreDto,
  ) {
    return this.libraryService.addFavoriteGenre(
      user.userId,
      dto.genreId,
      dto.externalParams,
    );
  }

  @Delete('genres/:genreId')
  @ApiOperation({ summary: 'Eliminar género de favoritos' })
  @ApiParam({ name: 'genreId', description: 'ID del género' })
  @ApiResponse({
    status: 200,
    description: 'Género eliminado de favoritos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Género no está en favoritos' })
  async removeFavoriteGenre(
    @CurrentUser() user: any,
    @Param('genreId') genreId: string,
  ) {
    await this.libraryService.removeFavoriteGenre(user.userId, genreId);
    return { message: 'Genre removed from favorites' };
  }

  @Get('genres')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Obtener géneros favoritos del usuario' })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Elementos por página',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Géneros favoritos obtenidos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getFavoriteGenres(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.libraryService.getFavoriteGenres(user.userId, page, limit);
  }

  @Get('genres/:genreId/check')
  @ApiOperation({ summary: 'Verificar si un género está en favoritos' })
  @ApiParam({ name: 'genreId', description: 'ID del género' })
  @ApiResponse({
    status: 200,
    description: 'Estado de favorito obtenido',
    schema: {
      type: 'object',
      properties: {
        isFavorite: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async checkGenreFavorite(
    @CurrentUser() user: any,
    @Param('genreId') genreId: string,
  ) {
    const isFavorite = await this.libraryService.isGenreFavorite(
      user.userId,
      genreId,
    );
    return { isFavorite };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obtener resumen de la biblioteca del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Resumen de biblioteca obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        favoriteSongs: { type: 'number' },
        favoritePlaylists: { type: 'number' },
        favoriteGenres: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getLibrarySummary(@CurrentUser() user: any) {
    return this.libraryService.getLibrarySummary(user.userId);
  }

  // ============ User Playlists (Playlists creadas por el usuario) ============

  @Post('user-playlists')
  @ApiOperation({ summary: 'Crear una nueva playlist' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la playlist' },
        description: { type: 'string', description: 'Descripción opcional' },
        thumbnail: { type: 'string', description: 'URL de thumbnail opcional' },
        isPublic: { type: 'boolean', description: 'Si la playlist es pública', default: false },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Playlist creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createUserPlaylist(@CurrentUser() user: any, @Body() body: any) {
    return this.libraryService.createUserPlaylist(user.userId, body);
  }

  @Get('user-playlists')
  @ApiOperation({ summary: 'Obtener playlists del usuario' })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Elementos por página',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Playlists obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getUserPlaylists(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.libraryService.getUserPlaylists(user.userId, page, limit);
  }

  @Get('user-playlists/:playlistId')
  @ApiOperation({ summary: 'Obtener detalles de una playlist del usuario' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiResponse({ status: 200, description: 'Playlist obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async getUserPlaylist(@CurrentUser() user: any, @Param('playlistId') playlistId: string) {
    return this.libraryService.getUserPlaylist(user.userId, playlistId);
  }

  @Put('user-playlists/:playlistId')
  @ApiOperation({ summary: 'Actualizar una playlist del usuario' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        thumbnail: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Playlist actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async updateUserPlaylist(
    @CurrentUser() user: any,
    @Param('playlistId') playlistId: string,
    @Body() body: any,
  ) {
    return this.libraryService.updateUserPlaylist(user.userId, playlistId, body);
  }

  @Delete('user-playlists/:playlistId')
  @ApiOperation({ summary: 'Eliminar una playlist del usuario' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiResponse({ status: 200, description: 'Playlist eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async deleteUserPlaylist(@CurrentUser() user: any, @Param('playlistId') playlistId: string) {
    await this.libraryService.deleteUserPlaylist(user.userId, playlistId);
    return { message: 'Playlist deleted successfully' };
  }

  @Post('user-playlists/:playlistId/songs')
  @ApiOperation({ summary: 'Agregar canción a playlist del usuario' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'Video ID de la canción' },
        title: { type: 'string', description: 'Título de la canción' },
        artist: { type: 'string', description: 'Artista' },
        thumbnail: { type: 'string', description: 'URL del thumbnail' },
        duration: { type: 'number', description: 'Duración en segundos' },
      },
      required: ['videoId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Canción agregada a la playlist' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Playlist no encontrada' })
  async addSongToUserPlaylist(
    @CurrentUser() user: any,
    @Param('playlistId') playlistId: string,
    @Body() body: any,
  ) {
    return this.libraryService.addSongToUserPlaylist(user.userId, playlistId, body);
  }

  @Delete('user-playlists/:playlistId/songs/:songId')
  @ApiOperation({ summary: 'Eliminar canción de playlist del usuario' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiParam({ name: 'songId', description: 'ID de la canción en la playlist' })
  @ApiResponse({ status: 200, description: 'Canción eliminada de la playlist' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async removeSongFromUserPlaylist(
    @CurrentUser() user: any,
    @Param('playlistId') playlistId: string,
    @Param('songId') songId: string,
  ) {
    await this.libraryService.removeSongFromUserPlaylist(user.userId, playlistId, songId);
    return { message: 'Song removed from playlist' };
  }
}
