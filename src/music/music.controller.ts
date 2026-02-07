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
import { MusicApiService } from './services/music-api.service';
import { RecentSearchService } from './services/recent-search.service';
import { LibraryService } from '../library/library.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  ) { }

  @Get('explore')
  @ApiOperation({ summary: 'Explorar contenido: moods, géneros y charts' })
  @ApiResponse({
    status: 200,
    description: 'Contenido de exploración obtenido exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async explore() {
    try {
      return await this.musicApiService.explore();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch explore content',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('explore/moods/:params')
  @ApiOperation({ summary: 'Obtener playlists de un mood específico' })
  @ApiParam({ name: 'params', description: 'Parámetros del mood' })
  @ApiResponse({
    status: 200,
    description: 'Playlists del mood obtenidas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getMoodPlaylists(@Param('params') params: string) {
    try {
      return await this.musicApiService.getMoodPlaylists(params);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch mood playlists',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('explore/genres/:params')
  @ApiOperation({ summary: 'Obtener playlists de un género específico' })
  @ApiParam({ name: 'params', description: 'Parámetros del género' })
  @ApiResponse({
    status: 200,
    description: 'Playlists del género obtenidas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getGenrePlaylists(@Param('params') params: string) {
    try {
      return await this.musicApiService.getGenrePlaylists(params);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch genre playlists',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('playlists/:playlistId')
  @ApiOperation({ summary: 'Obtener detalles de una playlist' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiResponse({
    status: 200,
    description: 'Playlist obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getPlaylist(@Param('playlistId') playlistId: string) {
    try {
      return await this.musicApiService.getPlaylist(playlistId);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch playlist',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('stream/:videoId')
  @ApiOperation({ summary: 'Obtener URL de stream de audio de una canción' })
  @ApiParam({ name: 'videoId', description: 'ID del video/canción' })
  @ApiResponse({
    status: 200,
    description: 'URL de stream obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        streamUrl: { type: 'string', description: 'URL de stream de audio' },
        title: { type: 'string', description: 'Título de la canción' },
        artist: { type: 'string', description: 'Artista de la canción' },
        duration: { type: 'number', description: 'Duración en segundos' },
        thumbnail: { type: 'string', description: 'URL del thumbnail en mejor calidad' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  @ApiResponse({ status: 503, description: 'Servicio externo no disponible' })
  @ApiResponse({ status: 504, description: 'Timeout del servicio externo' })
  async getStreamUrl(@Param('videoId') videoId: string) {
    try {
      return await this.musicApiService.getStreamUrl(videoId);
    } catch (error) {
      // Si el error ya es un HttpException, re-lanzarlo para preservar el status code y mensaje
      if (error instanceof HttpException) {
        throw error;
      }
      // Si es otro tipo de error, lanzar un error genérico
      throw new HttpException(
        {
          message: 'Failed to get stream URL',
          statusCode: HttpStatus.BAD_GATEWAY,
          videoId,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('search')
  @ApiOperation({
    summary: 'Buscar música y guardar búsqueda en historial',
  })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', required: true })
  @ApiQuery({
    name: 'filter',
    description: 'Filtro de búsqueda (songs, playlists, etc.)',
    required: false,
    example: 'songs',
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda realizada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Parámetro de búsqueda requerido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async search(
    @Query('q') query: string,
    @Query('filter') filter: string = 'songs',
    @CurrentUser() user: any,
  ) {
    if (!query) {
      throw new HttpException(
        'Query parameter "q" is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const results = await this.musicApiService.search(query, filter);

      // Extraer la primera canción completa de los resultados si hay canciones
      // Guardamos toda la información de la canción para retornarla en búsquedas recientes
      const firstSong =
        results.results && results.results.length > 0
          ? results.results.find((item) => item.videoId && item.videoId.trim() !== '')
          : undefined;

      const videoId = firstSong?.videoId;
      const songData = firstSong || null;

      // Guardar búsqueda del usuario autenticado con videoId y songData completa
      await this.recentSearchService.saveSearch(
        user.userId,
        query,
        filter,
        videoId,
        songData,
      );

      return results;
    } catch (error) {
      throw new HttpException(
        'Failed to search music',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('recent-searches')
  @ApiOperation({ summary: 'Obtener búsquedas recientes del usuario' })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de búsquedas a retornar',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Búsquedas recientes obtenidas exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          videoId: {
            type: 'string',
            nullable: true,
            description: 'videoId de la primera canción encontrada',
          },
          songData: {
            type: 'object',
            nullable: true,
            description: 'Información completa de la primera canción encontrada (title, album, artists, thumbnails, duration, etc.)',
            example: {
              category: 'Songs',
              resultType: 'song',
              title: 'Song Title',
              album: { name: 'Album Name', id: 'album_id' },
              videoId: 'video_id',
              artists: [{ name: 'Artist Name', id: 'artist_id' }],
              duration: '3:45',
              duration_seconds: 225,
              views: '1M',
              thumbnails: [{ url: 'thumbnail_url', width: 120, height: 120 }],
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          lastSearchedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentSearches(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const searches = await this.recentSearchService.getRecentSearches(
      user.userId,
      limit,
    );

    // Retornar solo los campos necesarios, excluyendo userId, query, filter, searchCount
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
  @ApiResponse({
    status: 200,
    description: 'Búsqueda eliminada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async deleteRecentSearch(
    @CurrentUser() user: any,
    @Param('searchId') searchId: string,
  ) {
    await this.recentSearchService.deleteSearch(user.userId, searchId);
    return { message: 'Search deleted successfully' };
  }

  @Delete('recent-searches')
  @ApiOperation({ summary: 'Limpiar todas las búsquedas recientes del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Todas las búsquedas eliminadas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async clearRecentSearches(@CurrentUser() user: any) {
    await this.recentSearchService.clearRecentSearches(user.userId);
    return { message: 'All recent searches cleared' };
  }

  @Get('for-you')
  @ApiOperation({
    summary: 'Obtener contenido personalizado "Para ti" basado en favoritos',
  })
  @ApiResponse({
    status: 200,
    description: 'Contenido personalizado obtenido exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getForYouContent(@CurrentUser() user: any) {
    try {
      // Obtener favoritos del usuario para personalizar
      const [favoriteSongs, favoritePlaylists, favoriteGenres] =
        await Promise.all([
          this.libraryService.getFavoriteSongs(user.userId, 1, 5),
          this.libraryService.getFavoritePlaylists(user.userId, 1, 5),
          this.libraryService.getFavoriteGenres(user.userId, 1, 5),
        ]);

      // Obtener contenido de exploración
      const exploreContent = await this.musicApiService.explore();

      // Crear mixes personalizados basados en favoritos
      const forYouMixes: Array<{
        title: string;
        type: string;
        playlists: any[];
      }> = [];

      // Mix basado en géneros favoritos
      if (favoriteGenres.data.length > 0) {
        const genreParams = favoriteGenres.data[0].genre.externalParams;
        if (genreParams) {
          try {
            const genrePlaylists = await this.musicApiService.getGenrePlaylists(
              genreParams,
            );
            forYouMixes.push({
              title: `Mix basado en ${favoriteGenres.data[0].genre.name}`,
              type: 'genre',
              playlists: genrePlaylists.slice(0, 5),
            });
          } catch (error) {
            // Ignorar errores de géneros
          }
        }
      }

      return {
        mixes: forYouMixes,
        favoriteSongs: favoriteSongs.data.slice(0, 10),
        favoritePlaylists: favoritePlaylists.data.slice(0, 5),
        exploreContent,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch for you content',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('recently-listened')
  @ApiOperation({
    summary: 'Obtener canciones recientemente escuchadas (favoritas más recientes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Canciones recientes obtenidas exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getRecentlyListened(@CurrentUser() user: any) {
    try {
      // Obtener canciones favoritas más recientes
      const favoriteSongs = await this.libraryService.getFavoriteSongs(
        user.userId,
        1,
        20,
      );

      return {
        songs: favoriteSongs.data.map((fav) => ({
          ...fav.song,
          addedAt: fav.createdAt,
        })),
        total: favoriteSongs.total,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch recently listened',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener todas las categorías disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Categorías obtenidas exitosamente',
  })
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
      throw new HttpException(
        'Failed to fetch categories',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('genres')
  @ApiOperation({ summary: 'Obtener todos los géneros y moods disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Géneros obtenidos exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getGenres() {
    try {
      const exploreContent = await this.musicApiService.explore();
      return {
        genres: exploreContent.genres || [],
        moods: exploreContent.moods || [],
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch genres',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
