import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Delete,
  Put,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
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
import { MusicApiService } from './services/music-api.service';
import { RecentSearchService } from './services/recent-search.service';
import { ListenHistoryService } from './services/listen-history.service';
import { LibraryService } from '../library/library.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('music')
@ApiBearerAuth('JWT-auth')
@Controller('music')
// NO usar cache - el servicio Python ya cachea las stream URLs
// Cachear aquí causa problemas con URLs expiradas
export class MusicController {
  constructor(
    private readonly musicApiService: MusicApiService,
    private readonly recentSearchService: RecentSearchService,
    private readonly libraryService: LibraryService,
    private readonly listenHistoryService: ListenHistoryService,
  ) {}

  @Get('explore')
  @ApiOperation({ summary: 'Explorar contenido: moods, géneros y charts' })
  @ApiResponse({ status: 200, description: 'Contenido de exploración obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async explore() {
    try {
      return await this.musicApiService.explore();
    } catch (error) {
      throw new HttpException('Failed to fetch explore content', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('explore/moods/:params')
  @ApiOperation({ summary: 'Obtener playlists de un mood específico' })
  @ApiParam({ name: 'params', description: 'Parámetros del mood' })
  @ApiResponse({ status: 200, description: 'Playlists del mood obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getMoodPlaylists(@Param('params') params: string) {
    try {
      return await this.musicApiService.getMoodPlaylists(params);
    } catch (error) {
      throw new HttpException('Failed to fetch mood playlists', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('explore/genres/:params')
  @ApiOperation({ summary: 'Obtener playlists de un género específico' })
  @ApiParam({ name: 'params', description: 'Parámetros del género' })
  @ApiResponse({ status: 200, description: 'Playlists del género obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getGenrePlaylists(@Param('params') params: string) {
    try {
      return await this.musicApiService.getGenrePlaylists(params);
    } catch (error) {
      throw new HttpException('Failed to fetch genre playlists', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('playlists/:playlistId')
  @ApiOperation({ summary: 'Obtener detalles de una playlist' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', description: 'Número de canciones a obtener', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Playlist obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getPlaylist(
    @Param('playlistId') playlistId: string,
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    try {
      return await this.musicApiService.getPlaylist(playlistId, startIndex, limit);
    } catch (error) {
      throw new HttpException('Failed to fetch playlist', HttpStatus.BAD_GATEWAY);
    }
  }

  @Public()
  @Get('stream/:videoId')
  @ApiOperation({ summary: 'Obtener URL de stream de audio de una canción' })
  @ApiParam({ name: 'videoId', description: 'ID del video/canción' })
  @ApiQuery({ name: 'bypass_cache', description: 'Ignorar caché y obtener URL fresca', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'URL de stream obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getStreamUrl(
    @Param('videoId') videoId: string,
    @Query('bypass_cache') bypassCache: string = 'false',
  ) {
    try {
      const bypass = bypassCache.toLowerCase() === 'true';
      return await this.musicApiService.getStreamUrl(videoId, bypass);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: 'Failed to get stream URL', statusCode: HttpStatus.BAD_GATEWAY, videoId },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // El endpoint stream-proxy fue movió al servicio Python (FastAPI)
  // El endpoint /music/stream/{videoId} retorna { streamUrl, proxyUrl }
  // Flutter usa streamUrl (URL directa de YouTube) para reproducción directa
  // Ver: music-api.service.ts línea 241

  @Get('search')
  @ApiOperation({ summary: 'Buscar música y guardar búsqueda en historial' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', required: true })
  @ApiQuery({ name: 'filter', description: 'Filtro de búsqueda', required: false, example: 'songs' })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', description: 'Número de resultados', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Búsqueda realizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetro de búsqueda requerido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async search(
    @Query('q') query: string,
    @Query('filter') filter: string = 'songs',
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @CurrentUser() user: any,
  ) {
    if (!query) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Guardar la búsqueda (solo la query, sin canción seleccionada)
      // La canción se actualiza cuando el usuario selecciona una (ver updateSelectedSong)
      await this.recentSearchService.saveSearch(user.userId, query, filter);

      const results = await this.musicApiService.search(query, filter, startIndex, limit);
      return results;
    } catch (error) {
      throw new HttpException('Failed to search music', HttpStatus.BAD_GATEWAY);
    }
  }

  @Put('recent-searches/select')
  @ApiOperation({ summary: 'Actualizar la canción seleccionada en una búsqueda reciente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Término de búsqueda original' },
        videoId: { type: 'string', description: 'ID del video seleccionado' },
        songData: { type: 'object', description: 'Datos de la canción seleccionada' },
      },
      required: ['query', 'videoId', 'songData'],
    },
  })
  @ApiResponse({ status: 200, description: 'Canción seleccionada actualizada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateSelectedSong(
    @CurrentUser() user: any,
    @Body() body: { query: string; videoId: string; songData: any },
  ) {
    const result = await this.recentSearchService.updateSelectedSong(
      user.userId,
      body.query,
      body.videoId,
      body.songData,
    );
    return {
      message: 'Selected song updated successfully',
      search: {
        id: result.id,
        query: result.query,
        videoId: result.videoId,
      },
    };
  }

  @Get('recent-searches')
  @ApiOperation({ summary: 'Obtener búsquedas recientes del usuario' })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', description: 'Número máximo de búsquedas', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Búsquedas recientes obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentSearches(
    @CurrentUser() user: any,
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const searches = await this.recentSearchService.getRecentSearches(user.userId, startIndex, limit);
    return searches.map((search) => ({
      id: search.id,
      query: search.query,
      filter: search.filter,
      videoId: search.videoId,
      songData: search.songData,
      createdAt: search.createdAt,
      lastSearchedAt: search.lastSearchedAt,
    }));
  }

  @Delete('recent-searches/:searchId')
  @ApiOperation({ summary: 'Eliminar una búsqueda específica del historial' })
  @ApiParam({ name: 'searchId', description: 'ID de la búsqueda a eliminar' })
  @ApiResponse({ status: 200, description: 'Búsqueda eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async deleteRecentSearch(@CurrentUser() user: any, @Param('searchId') searchId: string) {
    await this.recentSearchService.deleteSearch(user.userId, searchId);
    return { message: 'Search deleted successfully' };
  }

  @Delete('recent-searches')
  @ApiOperation({ summary: 'Limpiar todas las búsquedas recientes del usuario' })
  @ApiResponse({ status: 200, description: 'Todas las búsquedas eliminadas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async clearRecentSearches(@CurrentUser() user: any) {
    await this.recentSearchService.clearRecentSearches(user.userId);
    return { message: 'All recent searches cleared' };
  }

  @Get('for-you')
  @ApiOperation({ summary: 'Obtener contenido personalizado "Para ti" basado en favoritos' })
  @ApiResponse({ status: 200, description: 'Contenido personalizado obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getForYouContent(@CurrentUser() user: any) {
    try {
      const [favoriteSongs, favoritePlaylists, favoriteGenres, exploreContent] = await Promise.all([
        this.libraryService.getFavoriteSongs(user.userId, 1, 5),
        this.libraryService.getFavoritePlaylists(user.userId, 1, 5),
        this.libraryService.getFavoriteGenres(user.userId, 1, 5),
        this.musicApiService.explore(),
      ]);

      const forYouMixes: Array<{ title: string; type: string; playlists: any[] }> = [];

      if (favoriteGenres.data.length > 0) {
        const genreParams = favoriteGenres.data[0].genre.externalParams;
        if (genreParams) {
          try {
            const genrePlaylists = await this.musicApiService.getGenrePlaylists(genreParams);
            forYouMixes.push({
              title: `Mix basado en ${favoriteGenres.data[0].genre.name}`,
              type: 'genre',
              playlists: genrePlaylists.slice(0, 5),
            });
          } catch (error) {}
        }
      }

      return {
        mixes: forYouMixes,
        favoriteSongs: favoriteSongs.data.slice(0, 10),
        favoritePlaylists: favoritePlaylists.data.slice(0, 5),
        exploreContent,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch for you content', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('recently-listened')
  @ApiOperation({ summary: 'Obtener canciones recientemente escuchadas' })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'limit', description: 'Número de canciones', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Canciones recientes obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentlyListened(
    @CurrentUser() user: any,
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    try {
      return await this.listenHistoryService.getRecentlyListenedWithStreams(
        user.userId,
        limit,
        startIndex,
      );
    } catch (error) {
      throw new HttpException('Failed to fetch recently listened', HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('record-listen')
  @ApiOperation({ summary: 'Registrar una reproducción en el historial' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'Video ID de YouTube' },
      },
      required: ['videoId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Reproducción registrada exitosamente' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async recordListen(
    @CurrentUser() user: any,
    @Body() body: { videoId: string },
  ) {
    try {
      const { videoId } = body;
      
      if (!videoId) {
        throw new HttpException('videoId is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.listenHistoryService.recordListen(user.userId, videoId);
      
      if (!result) {
        return { success: false, message: 'Invalid videoId' };
      }
      
      return { success: true, message: 'Listen recorded successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('recordListen error:', error);
      throw new HttpException('Failed to record listen', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener todas las categorías disponibles' })
  @ApiResponse({ status: 200, description: 'Categorías obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getCategories() {
    try {
      const exploreContent = await this.musicApiService.explore();
      return {
        moods: exploreContent.moods || [],
        genres: exploreContent.genres || [],
        charts: exploreContent.charts || [],
      };
    } catch (error) {
      throw new HttpException('Failed to fetch categories', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('genres')
  @ApiOperation({ summary: 'Obtener todos los géneros y moods disponibles' })
  @ApiResponse({ status: 200, description: 'Géneros obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getGenres() {
    try {
      const exploreContent = await this.musicApiService.explore();
      return { genres: exploreContent.genres || [], moods: exploreContent.moods || [] };
    } catch (error) {
      throw new HttpException('Failed to fetch genres', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('radio/:videoId')
  @ApiOperation({ summary: 'Obtener playlist de radio basada en una canción' })
  @ApiParam({ name: 'videoId', description: 'ID del video/canción' })
  @ApiQuery({ name: 'limit', description: 'Número de canciones', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Playlist de radio obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getRadio(
    @Param('videoId') videoId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
  ) {
    try {
      return await this.musicApiService.getRadioPlaylist(videoId, limit, startIndex, true); // include_stream_urls=true
    } catch (error) {
      throw new HttpException('Failed to fetch radio playlist', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('watch')
  @ApiOperation({ summary: 'Obtener playlist de reproducción (siguientes canciones)' })
  @ApiQuery({ name: 'video_id', description: 'ID del video para iniciar', required: false, type: String })
  @ApiQuery({ name: 'playlist_id', description: 'ID de la playlist', required: false, type: String })
  @ApiQuery({ name: 'limit', description: 'Número de canciones', required: false, type: Number, example: 25 })
  @ApiQuery({ name: 'start_index', description: 'Índice inicial para paginación', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'shuffle', description: 'Mezclar playlist', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Playlist de reproducción obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Se requiere video_id o playlist_id' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getWatchPlaylist(
    @Query('video_id') videoId: string,
    @Query('playlist_id') playlistId: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('start_index', new DefaultValuePipe(0), ParseIntPipe) startIndex: number = 0,
    @Query('shuffle', new DefaultValuePipe(false)) shuffle: boolean = false,
  ) {
    if (!videoId && !playlistId) {
      throw new HttpException('Se requiere video_id o playlist_id', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.musicApiService.getWatchPlaylist(
        videoId || undefined,
        playlistId || undefined,
        limit,
        startIndex,
        shuffle,
        true, // includeStreamUrls
        10, // prefetchCount
      );
    } catch (error) {
      throw new HttpException('Failed to fetch watch playlist', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('lyrics/:browseId')
  @ApiOperation({ summary: 'Obtener lyrics de una canción' })
  @ApiParam({ name: 'browseId', description: 'Browse ID de la canción' })
  @ApiResponse({ status: 200, description: 'Lyrics obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getLyrics(@Param('browseId') browseId: string) {
    try {
      return await this.musicApiService.getLyrics(browseId);
    } catch (error) {
      throw new HttpException('Failed to fetch lyrics', HttpStatus.BAD_GATEWAY);
    }
  }
}
