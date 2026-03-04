import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Delete,
  DefaultValuePipe,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { MusicApiService } from './services/music-api.service';
import { RecentSearchService } from './services/recent-search.service';
import { LibraryService } from '../library/library.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';

@ApiTags('music')
@ApiBearerAuth('JWT-auth')
@Controller('music')
@UseInterceptors(HttpCacheInterceptor)
export class MusicController {
  constructor(
    private readonly musicApiService: MusicApiService,
    private readonly recentSearchService: RecentSearchService,
    private readonly libraryService: LibraryService,
  ) {}

  @Get('explore')
  @UseInterceptors(CacheInterceptor)
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
  @UseInterceptors(CacheInterceptor)
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
  @UseInterceptors(CacheInterceptor)
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
  // @UseInterceptors(CacheInterceptor) // Disabled - cache doesn't support pagination properly
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

  // El endpoint stream-proxy fue movido al servicio Python (FastAPI)
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
      const results = await this.musicApiService.search(query, filter, startIndex, limit);

      const firstSong = results.results && results.results.length > 0
        ? results.results.find((item) => item.videoId && item.videoId.trim() !== '')
        : undefined;

      const videoId = firstSong?.videoId;
      const songData = firstSong || null;

      await this.recentSearchService.saveSearch(user.userId, query, filter, videoId, songData);

      return results;
    } catch (error) {
      throw new HttpException('Failed to search music', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('recent-searches')
  @ApiOperation({ summary: 'Obtener búsquedas recientes del usuario' })
  @ApiQuery({ name: 'limit', description: 'Número máximo de búsquedas', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Búsquedas recientes obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentSearches(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const searches = await this.recentSearchService.getRecentSearches(user.userId, limit);
    return searches.map((search) => ({
      id: search.id,
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
      const [favoriteSongs, favoritePlaylists, favoriteGenres] = await Promise.all([
        this.libraryService.getFavoriteSongs(user.userId, 1, 5),
        this.libraryService.getFavoritePlaylists(user.userId, 1, 5),
        this.libraryService.getFavoriteGenres(user.userId, 1, 5),
      ]);

      const exploreContent = await this.musicApiService.explore();

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
  @ApiResponse({ status: 200, description: 'Canciones recientes obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentlyListened(@CurrentUser() user: any) {
    try {
      const favoriteSongs = await this.libraryService.getFavoriteSongs(user.userId, 1, 20);
      return {
        songs: favoriteSongs.data.map((fav) => ({ ...fav.song, addedAt: fav.createdAt })),
        total: favoriteSongs.total,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch recently listened', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('categories')
  @UseInterceptors(CacheInterceptor)
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
  @UseInterceptors(CacheInterceptor)
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
      return await this.musicApiService.getRadioPlaylist(videoId, limit, startIndex, false); // include_stream_urls=false
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
  @UseInterceptors(CacheInterceptor)
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
