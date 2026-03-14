import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { MusicApiService } from '../../../src/music/services/music-api.service';
import {
  mockExploreResponse,
  mockPlaylistResponse,
  mockSearchResponse,
  mockStreamResponse,
  mockVideoId,
  mockExternalPlaylistId,
} from '../../utils/mocks';

describe('MusicApiService', () => {
  let service: MusicApiService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockBaseUrl = 'http://localhost:8000/api/v1';
  const mockTimeout = 30000;

  const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  const createAxiosError = (
    code?: string,
    response?: Partial<AxiosResponse>,
    message?: string,
  ): AxiosError => {
    const error = new Error(message || 'Error') as AxiosError;
    error.code = code;
    error.response = response as AxiosResponse;
    error.request = response ? undefined : {};
    return error;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MusicApiService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'externalApi.musicServiceBaseUrl': mockBaseUrl,
                'externalApi.musicServiceTimeout': mockTimeout,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MusicApiService>(MusicApiService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // explore
  // =====================
  describe('explore', () => {
    it('should return explore content', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockExploreResponse)));

      const result = await service.explore();

      expect(result).toEqual(mockExploreResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/explore/?include_stream_urls=true`,
        { timeout: mockTimeout },
      );
    });

    it('should throw HttpException with BAD_GATEWAY on 5xx error', async () => {
      const axiosError = createAxiosError(undefined, {
        status: 500,
        data: { detail: 'Internal server error' },
      });
      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.explore())
        .rejects
        .toThrow(HttpException);
    });

    it('should throw HttpException with GATEWAY_TIMEOUT on timeout', async () => {
      const axiosError = createAxiosError('ECONNABORTED');
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      }
    });

    it('should throw HttpException with SERVICE_UNAVAILABLE on connection refused', async () => {
      const axiosError = createAxiosError('ECONNREFUSED');
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should throw HttpException with SERVICE_UNAVAILABLE on network error', async () => {
      const axiosError = createAxiosError('ENOTFOUND');
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR on request setup error', async () => {
      const error = new Error('Request setup error') as AxiosError;
      error.request = undefined;
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should extract error message from response.data.detail', async () => {
      const axiosError = createAxiosError(undefined, {
        status: 500,
        data: { detail: 'Custom error detail' },
      });
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe('Custom error detail');
      }
    });

    it('should extract error message from response.data.message', async () => {
      const axiosError = createAxiosError(undefined, {
        status: 500,
        data: { message: 'Custom error message' },
      });
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe('Custom error message');
      }
    });

    it('should extract error message from response.data.error', async () => {
      const axiosError = createAxiosError(undefined, {
        status: 500,
        data: { error: 'Custom error' },
      });
      httpService.get.mockReturnValue(throwError(() => axiosError));

      try {
        await service.explore();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe('Custom error');
      }
    });
  });

  // =====================
  // getMoodPlaylists
  // =====================
  describe('getMoodPlaylists', () => {
    it('should return mood playlists', async () => {
      const mockMoodPlaylists = [mockPlaylistResponse];
      httpService.get.mockReturnValue(of(createAxiosResponse(mockMoodPlaylists)));

      const result = await service.getMoodPlaylists('relax');

      expect(result).toEqual(mockMoodPlaylists);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/explore/moods/relax?include_stream_urls=true`,
        { timeout: mockTimeout },
      );
    });

    it('should handle empty results', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse([])));

      const result = await service.getMoodPlaylists('nonexistent');

      expect(result).toEqual([]);
    });
  });

  // =====================
  // getGenrePlaylists
  // =====================
  describe('getGenrePlaylists', () => {
    it('should return genre playlists', async () => {
      const mockGenrePlaylists = [mockPlaylistResponse];
      httpService.get.mockReturnValue(of(createAxiosResponse(mockGenrePlaylists)));

      const result = await service.getGenrePlaylists('pop');

      expect(result).toEqual(mockGenrePlaylists);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/explore/genres/pop?include_stream_urls=true`,
        { timeout: mockTimeout },
      );
    });
  });

  // =====================
  // getPlaylist
  // =====================
  describe('getPlaylist', () => {
    it('should return playlist details', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockPlaylistResponse)));

      const result = await service.getPlaylist(mockExternalPlaylistId);

      expect(result).toEqual(mockPlaylistResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/playlists/${mockExternalPlaylistId}?include_stream_urls=true&prefetch_count=10&start_index=0&limit=20`,
        { timeout: mockTimeout },
      );
    });

    it('should handle playlist with no songs', async () => {
      const emptyPlaylist = { ...mockPlaylistResponse, songs: [] };
      httpService.get.mockReturnValue(of(createAxiosResponse(emptyPlaylist)));

      const result = await service.getPlaylist('empty-playlist');

      expect(result.songs).toEqual([]);
    });
  });

  // =====================
  // getStreamUrl
  // =====================
  describe('getStreamUrl', () => {
    it('should return stream URL with metadata', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockStreamResponse)));

      const result = await service.getStreamUrl(mockVideoId);

      expect(result.streamUrl).toBe(mockStreamResponse.url);
      expect(result.title).toBe(mockStreamResponse.title);
      expect(result.artist).toBe(mockStreamResponse.artist);
      expect(result.duration).toBe(mockStreamResponse.duration);
      expect(result.thumbnail).toBe(mockStreamResponse.thumbnail);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/stream/${mockVideoId}`,
        { timeout: mockTimeout },
      );
    });

    it('should handle stream URL without optional fields', async () => {
      const minimalResponse = { url: 'https://example.com/stream.mp3' };
      httpService.get.mockReturnValue(of(createAxiosResponse(minimalResponse)));

      const result = await service.getStreamUrl(mockVideoId);

      expect(result.streamUrl).toBe(minimalResponse.url);
      expect(result.title).toBeUndefined();
      expect(result.artist).toBeUndefined();
    });
  });

  // =====================
  // search
  // =====================
  describe('search', () => {
    it('should search with default filter', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockSearchResponse)));

      const result = await service.search('test query');

      expect(result).toEqual(mockSearchResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/search/?q=test%20query&filter=songs&include_stream_urls=true&start_index=0&limit=20`,
        { timeout: mockTimeout },
      );
    });

    it('should search with custom filter', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockSearchResponse)));

      const result = await service.search('test query', 'playlists');

      expect(result).toEqual(mockSearchResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/search/?q=test%20query&filter=playlists&include_stream_urls=true&start_index=0&limit=20`,
        { timeout: mockTimeout },
      );
    });

    it('should encode special characters in query', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse(mockSearchResponse)));

      await service.search('test & special? characters');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('q=test%20%26%20special%3F%20characters'),
        expect.any(Object),
      );
    });

    it('should handle empty search results', async () => {
      const emptyResponse = { results: [], query: 'nonexistent' };
      httpService.get.mockReturnValue(of(createAxiosResponse(emptyResponse)));

      const result = await service.search('nonexistent');

      expect(result.results).toEqual([]);
    });
  });

  // =====================
  // Configuration
  // =====================
  describe('configuration', () => {
    it('should use default values when config not provided', async () => {
      const mockHttpServiceGet = jest.fn().mockReturnValue(of(createAxiosResponse(mockExploreResponse)));
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MusicApiService,
          {
            provide: HttpService,
            useValue: {
              get: mockHttpServiceGet,
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<MusicApiService>(MusicApiService);
      await serviceWithDefaults.explore();

      expect(mockHttpServiceGet).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8000/api/v1'),
        expect.objectContaining({ timeout: 30000 }),
      );
    });
  });
});
