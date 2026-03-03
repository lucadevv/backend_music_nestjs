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
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Obtener detalles de una playlist' })
  @ApiParam({ name: 'playlistId', description: 'ID de la playlist' })
  @ApiResponse({ status: 200, description: 'Playlist obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getPlaylist(@Param('playlistId') playlistId: string) {
    try {
      return await this.musicApiService.getPlaylist(playlistId);
    } catch (error) {
      throw new HttpException('Failed to fetch playlist', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('stream/:videoId')
  @ApiOperation({ summary: 'Obtener URL de stream de audio de una canción' })
  @ApiParam({ name: 'videoId', description: 'ID del video/canción' })
  @ApiResponse({ status: 200, description: 'URL de stream obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getStreamUrl(@Param('videoId') videoId: string) {
    try {
      return await this.musicApiService.getStreamUrl(videoId);
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

  @Public()
  @Get('stream-proxy/:videoId')
  @ApiOperation({ summary: 'Proxy de streaming con autenticación' })
  @ApiParam({ name: 'videoId', description: 'ID del video/canción' })
  @ApiQuery({ name: 'token', description: 'JWT token de acceso', required: true })
  @ApiResponse({ status: 200, description: 'Stream de audio', content: { 'audio/mpeg': {} } })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Video no encontrado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async streamProxy(
    @Param('videoId') videoId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const logger = new Logger('StreamProxy');

    // Validar el token
    if (!token) {
      throw new HttpException('Token es requerido', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Verificar el token con issuer y audience igual que en JwtStrategy
      const jwtSecret = this.configService.get<string>('jwt.secret') || 'Planeton100603453453453434543.-234234';
      const jwtIssuer = this.configService.get<string>('jwt.issuer') || 'music_app';
      const jwtAudience = this.configService.get<string>('jwt.audience') || 'music_app';
      
      // Verificar el token con issuer y audience
      const decoded = this.jwtService.verify(token, { 
        secret: jwtSecret,
        issuer: jwtIssuer,
        audience: jwtAudience,
      });
      
      if (!decoded || !decoded.sub) {
        throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
      }
      
      logger.log(`Token válido para usuario: ${decoded.sub}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Token inválido: ${errorMessage}`);
      throw new HttpException('Token inválido o expirado', HttpStatus.UNAUTHORIZED);
    }

    try {
      const streamData = await this.musicApiService.getStreamUrl(videoId);
      const youtubeUrl = streamData.streamUrl;

      logger.log(`Streaming video ${videoId} through proxy`);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'none');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (streamData.title) {
        res.setHeader('X-Title', streamData.title);
      }
      if (streamData.artist) {
        res.setHeader('X-Artist', streamData.artist);
      }
      if (streamData.duration) {
        res.setHeader('X-Duration', streamData.duration.toString());
      }

      const config: AxiosRequestConfig = {
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        },
      };

      const response = await firstValueFrom(
        this.musicApiService.getHttpService().get(youtubeUrl, config),
      );

      (response.data as any).pipe(res);

      res.on('close', () => {
        logger.log(`Stream closed for video ${videoId}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error streaming video ${videoId}: ${errorMessage}`);

      if (!res.headersSent) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException('Failed to stream audio', HttpStatus.BAD_GATEWAY);
      }
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar música y guardar búsqueda en historial' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', required: true })
  @ApiQuery({ name: 'filter', description: 'Filtro de búsqueda', required: false, example: 'songs' })
  @ApiResponse({ status: 200, description: 'Búsqueda realizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetro de búsqueda requerido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async search(
    @Query('q') query: string,
    @Query('filter') filter: string = 'songs',
    @CurrentUser() user: any,
  ) {
    if (!query) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const results = await this.musicApiService.search(query, filter);

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
  @ApiResponse({ status: 200, description: 'Playlist de radio obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 502, description: 'Error del servicio externo' })
  async getRadio(
    @Param('videoId') videoId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    try {
      return await this.musicApiService.getRadioPlaylist(videoId, limit, true); // include_stream_urls=true
    } catch (error) {
      throw new HttpException('Failed to fetch radio playlist', HttpStatus.BAD_GATEWAY);
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
