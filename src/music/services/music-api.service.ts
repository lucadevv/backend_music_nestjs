import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

export interface ExploreResponse {
  moods?: Array<{ name: string; params: string }>;
  genres?: Array<{ name: string; params: string }>;
  charts?: {
    top_songs?: Array<{
      videoId: string;
      title: string;
      artist?: string;
      stream_url?: string;
      thumbnail?: string;
    }>;
    trending?: Array<{
      videoId: string;
      title: string;
      artist?: string;
      stream_url?: string;
      thumbnail?: string;
    }>;
  } | Array<{
    title: string;
    videoId: string;
    artist?: string;
    stream_url?: string;
    thumbnail?: string;
  }>;
  [key: string]: any;
}

export interface PlaylistResponse {
  playlistId: string;
  title: string;
  description?: string;
  songs?: Array<{
    videoId: string;
    title: string;
    artist: string;
    duration?: number;
    stream_url?: string;
    thumbnail?: string;
  }>;
  tracks?: Array<{
    videoId: string;
    title: string;
    artists?: Array<{ name: string; id?: string }>;
    stream_url?: string;
    thumbnail?: string;
  }>;
  [key: string]: any;
}

export interface SearchResponse {
  results: Array<{
    videoId: string;
    title: string;
    artists?: Array<{ name: string; id: string }>;
    album?: { name: string; id: string };
    duration?: string;
    duration_seconds?: number;
    views?: string;
    thumbnails?: Array<{ url: string; width: number; height: number }>;
    thumbnail?: string;
    stream_url?: string;
    category?: string;
    resultType?: string;
    [key: string]: any;
  }>;
  query: string;
}

@Injectable()
export class MusicApiService {
  private readonly logger = new Logger(MusicApiService.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('externalApi.musicServiceBaseUrl') || 'http://localhost:8000/api/v1';
    this.timeout = this.configService.get<number>('externalApi.musicServiceTimeout') || 30000;
    this.logger.log(`MusicApiService initialized with baseUrl: ${this.baseUrl}, timeout: ${this.timeout}ms`);
  }

  /**
   * Get the HttpService instance for direct API calls (e.g., streaming proxy)
   */
  getHttpService(): HttpService {
    return this.httpService;
  }

  private async request<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const requestConfig: AxiosRequestConfig = {
        timeout: this.timeout,
        ...config,
      };

      const response = await firstValueFrom(
        this.httpService.get<T>(url, requestConfig),
      );

      return response.data;
    } catch (error: any) {

      this.logger.error(`Error calling ${this.baseUrl}${endpoint}`, {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED',
      });

      if (error.response) {

        const status = error.response.status;
        const responseData = error.response.data;


        let message = 'External service error';
        if (responseData?.detail) {
          message = responseData.detail;
        } else if (responseData?.message) {
          message = responseData.message;
        } else if (responseData?.error) {
          message = responseData.error;
        }



        const httpStatus = status >= 500 && status < 600
          ? status
          : HttpStatus.BAD_GATEWAY;

        throw new HttpException(
          {
            message,
            statusCode: httpStatus,
            endpoint: `${this.baseUrl}${endpoint}`,
            details: responseData,
          },
          httpStatus,
        );
      } else if (error.request) {

        if (error.code === 'ECONNABORTED') {
          throw new HttpException(
            {
              message: `Request timeout after ${this.timeout}ms`,
              statusCode: HttpStatus.GATEWAY_TIMEOUT,
              endpoint: `${this.baseUrl}${endpoint}`,
            },
            HttpStatus.GATEWAY_TIMEOUT,
          );
        } else if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            {
              message: 'External music service is not available (connection refused)',
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              endpoint: `${this.baseUrl}${endpoint}`,
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        } else {
          throw new HttpException(
            {
              message: 'External music service is not available',
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              endpoint: `${this.baseUrl}${endpoint}`,
              error: error.code || error.message,
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      } else {

        throw new HttpException(
          {
            message: 'Error connecting to external music service',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            endpoint: `${this.baseUrl}${endpoint}`,
            error: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async explore(): Promise<ExploreResponse> {
    return this.request<ExploreResponse>('/explore/?include_stream_urls=true');
  }

  async getMoodPlaylists(params: string): Promise<PlaylistResponse[]> {
    return this.request<PlaylistResponse[]>(`/explore/moods/${params}?include_stream_urls=true`);
  }

  async getGenrePlaylists(params: string): Promise<PlaylistResponse[]> {
    return this.request<PlaylistResponse[]>(`/explore/genres/${params}?include_stream_urls=true`);
  }

  async getPlaylist(playlistId: string, startIndex: number = 0, limit: number = 20): Promise<PlaylistResponse> {
    return this.request<PlaylistResponse>(`/playlists/${playlistId}?include_stream_urls=true&prefetch_count=10&start_index=${startIndex}&limit=${limit}`);
  }

  async getStreamUrl(videoId: string, bypassCache: boolean = false): Promise<{
    streamUrl: string;
    proxyUrl: string;
    title?: string;
    artist?: string;
    duration?: number;
    thumbnail?: string;
  }> {
    // Usar cache de Python (Redis) por defecto
    // El cache de streaming URLs está en Python con TTL de 4 horas
    // Esto reduce llamadas a YouTube y evita rate limiting
    // bypassCache=true fuerza obtener URL fresca
    const bypassParam = bypassCache ? '?bypass_cache=true' : '';
    const response = await this.request<{
      streamUrl: string;
      title?: string;
      artist?: string;
      duration?: number;
      thumbnail?: string;
    }>(`/stream/${videoId}${bypassParam}`);

    // Construir la URL del proxy usando el servicio Python (público, sin auth)
    // El endpoint /stream/proxy/{videoId} hace el proxy directamente sin problemas de CORS
    const musicServiceBaseUrl = this.configService.get<string>('externalApi.musicServiceBaseUrl') || 'http://localhost:8000/api/v1';
    const proxyUrl = `${musicServiceBaseUrl}/stream/proxy/${videoId}`;

    return {
      streamUrl: response.streamUrl,
      proxyUrl: proxyUrl,
      title: response.title,
      artist: response.artist,
      duration: response.duration,
      thumbnail: response.thumbnail,
    };
  }

  async getBatchStreamUrls(videoIds: string[]): Promise<{
    results: Array<{
      videoId: string;
      url?: string;
      title?: string;
      artist?: string;
      duration?: number;
      thumbnail?: string;
      cached?: boolean;
      error?: string;
    }>;
    summary: {
      total: number;
      cached: number;
      fetched: number;
      failed: number;
    };
  }> {
    // Usar el endpoint batch de FastAPI (GET method)
    const response = await this.request<{
      results: Array<any>;
      summary: any;
    }>(`/stream/batch?video_ids=${videoIds.join(',')}`);

    return {
      results: response.results.map((r: any) => ({
        videoId: r.videoId,
        streamUrl: r.streamUrl,
        title: r.title,
        artist: r.artist,
        duration: r.duration,
        thumbnail: r.thumbnail,
        cached: r.cached,
        error: r.error,
      })),
      summary: response.summary,
    };
  }

  async getStreamCacheStatus(videoId: string): Promise<{
    cached: boolean;
    expiresIn: number;
  }> {
    const response = await this.request<{
      cached: boolean;
      expiresIn: number;
    }>(`/stream/${videoId}/status`);

    return response;
  }

  async search(query: string, filter: string = 'songs', startIndex: number = 0, limit: number = 20): Promise<SearchResponse> {
    return this.request<SearchResponse>(
      `/search/?q=${encodeURIComponent(query)}&filter=${filter}&include_stream_urls=true&start_index=${startIndex}&limit=${limit}`
    );
  }

  async getRadioPlaylist(videoId: string, limit: number = 10, startIndex: number = 0, includeStreamUrls: boolean = false): Promise<{
    tracks: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string; id?: string }>;
      duration?: number;
      thumbnail?: string;
      stream_url?: string;
    }>;
  }> {
    const streamParam = includeStreamUrls ? '&include_stream_urls=true' : '';
    return this.request<{
      tracks: Array<{
        videoId: string;
        title: string;
        artists?: Array<{ name: string; id?: string }>;
        duration?: number;
        thumbnail?: string;
        stream_url?: string;
      }>;
    }>(`/watch/?video_id=${videoId}&radio=true&limit=${limit}&start_index=${startIndex}${streamParam}`);
  }

  async getWatchPlaylist(
    videoId?: string,
    playlistId?: string,
    limit: number = 25,
    startIndex: number = 0,
    shuffle: boolean = false,
    includeStreamUrls: boolean = true,
    prefetchCount: number = 10,
  ): Promise<{
    tracks: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string; id?: string }>;
      duration?: number;
      thumbnail?: string;
      stream_url?: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (videoId) params.append('video_id', videoId);
    if (playlistId) params.append('playlist_id', playlistId);
    params.append('limit', limit.toString());
    params.append('start_index', startIndex.toString());
    if (shuffle) params.append('shuffle', 'true');
    if (includeStreamUrls) params.append('include_stream_urls', 'true');
    params.append('prefetch_count', prefetchCount.toString());

    return this.request<{
      tracks: Array<{
        videoId: string;
        title: string;
        artists?: Array<{ name: string; id?: string }>;
        duration?: number;
        thumbnail?: string;
        stream_url?: string;
      }>;
    }>(`/watch/?${params.toString()}`);
  }

  async getLyrics(browseId: string): Promise<{ lyrics?: string; source?: string; error?: string }> {
    return this.request<{ lyrics?: string; source?: string; error?: string }>(
      `/browse/lyrics-by-video/${browseId}`
    );
  }
}
