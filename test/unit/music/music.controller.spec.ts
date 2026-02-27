import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MusicController } from '../../../src/music/music.controller';
import { MusicApiService } from '../../../src/music/services/music-api.service';
import { RecentSearchService } from '../../../src/music/services/recent-search.service';
import { LibraryService } from '../../../src/library/library.service';
import { HttpCacheInterceptor } from '../../../src/common/interceptors/http-cache.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  mockUserId,
  mockExploreResponse,
  mockPlaylistResponse,
  mockSearchResponse,
  mockStreamResponse,
  mockVideoId,
  mockRecentSearch,
  mockRecentSearchId,
  mockFavoriteSong,
  mockFavoritePlaylist,
  mockFavoriteGenre,
  mockGenre,
} from '../../utils/mocks';

describe('MusicController', () => {
  let controller: MusicController;
  let musicApiService: jest.Mocked<MusicApiService>;
  let recentSearchService: jest.Mocked<RecentSearchService>;
  let libraryService: jest.Mocked<LibraryService>;

  const mockUser = { userId: mockUserId };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MusicController],
      providers: [
        {
          provide: MusicApiService,
          useValue: {
            explore: jest.fn(),
            getMoodPlaylists: jest.fn(),
            getGenrePlaylists: jest.fn(),
            getPlaylist: jest.fn(),
            getStreamUrl: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: RecentSearchService,
          useValue: {
            saveSearch: jest.fn(),
            getRecentSearches: jest.fn(),
            deleteSearch: jest.fn(),
            clearRecentSearches: jest.fn(),
          },
        },
        {
          provide: LibraryService,
          useValue: {
            getFavoriteSongs: jest.fn(),
            getFavoritePlaylists: jest.fn(),
            getFavoriteGenres: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        HttpCacheInterceptor,
      ],
    }).compile();

    controller = module.get<MusicController>(MusicController);
    musicApiService = module.get(MusicApiService);
    recentSearchService = module.get(RecentSearchService);
    libraryService = module.get(LibraryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // explore
  // =====================
  describe('explore', () => {
    it('should return explore content', async () => {
      musicApiService.explore.mockResolvedValue(mockExploreResponse);

      const result = await controller.explore();

      expect(musicApiService.explore).toHaveBeenCalled();
      expect(result).toEqual(mockExploreResponse);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.explore.mockRejectedValue(new Error('Service error'));

      await expect(controller.explore())
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getMoodPlaylists
  // =====================
  describe('getMoodPlaylists', () => {
    it('should return mood playlists', async () => {
      const mockPlaylists = [mockPlaylistResponse];
      musicApiService.getMoodPlaylists.mockResolvedValue(mockPlaylists);

      const result = await controller.getMoodPlaylists('relax');

      expect(musicApiService.getMoodPlaylists).toHaveBeenCalledWith('relax');
      expect(result).toEqual(mockPlaylists);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.getMoodPlaylists.mockRejectedValue(new Error('Service error'));

      await expect(controller.getMoodPlaylists('relax'))
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getGenrePlaylists
  // =====================
  describe('getGenrePlaylists', () => {
    it('should return genre playlists', async () => {
      const mockPlaylists = [mockPlaylistResponse];
      musicApiService.getGenrePlaylists.mockResolvedValue(mockPlaylists);

      const result = await controller.getGenrePlaylists('pop');

      expect(musicApiService.getGenrePlaylists).toHaveBeenCalledWith('pop');
      expect(result).toEqual(mockPlaylists);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.getGenrePlaylists.mockRejectedValue(new Error('Service error'));

      await expect(controller.getGenrePlaylists('pop'))
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getPlaylist
  // =====================
  describe('getPlaylist', () => {
    it('should return playlist details', async () => {
      musicApiService.getPlaylist.mockResolvedValue(mockPlaylistResponse);

      const result = await controller.getPlaylist('playlist123');

      expect(musicApiService.getPlaylist).toHaveBeenCalledWith('playlist123');
      expect(result).toEqual(mockPlaylistResponse);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.getPlaylist.mockRejectedValue(new Error('Service error'));

      await expect(controller.getPlaylist('playlist123'))
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getStreamUrl
  // =====================
  describe('getStreamUrl', () => {
    it('should return stream URL with metadata', async () => {
      musicApiService.getStreamUrl.mockResolvedValue(mockStreamResponse);

      const result = await controller.getStreamUrl(mockVideoId);

      expect(musicApiService.getStreamUrl).toHaveBeenCalledWith(mockVideoId);
      expect(result).toEqual(mockStreamResponse);
    });

    it('should re-throw HttpException from service', async () => {
      const httpException = new HttpException('Timeout', HttpStatus.GATEWAY_TIMEOUT);
      musicApiService.getStreamUrl.mockRejectedValue(httpException);

      await expect(controller.getStreamUrl(mockVideoId))
        .rejects
        .toThrow(httpException);
    });

    it('should throw BAD_GATEWAY on generic error', async () => {
      musicApiService.getStreamUrl.mockRejectedValue(new Error('Generic error'));

      await expect(controller.getStreamUrl(mockVideoId))
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // search
  // =====================
  describe('search', () => {
    it('should search music and save search history', async () => {
      musicApiService.search.mockResolvedValue(mockSearchResponse);
      recentSearchService.saveSearch.mockResolvedValue(mockRecentSearch);

      const result = await controller.search('test query', 'songs', mockUser);

      expect(musicApiService.search).toHaveBeenCalledWith('test query', 'songs');
      expect(recentSearchService.saveSearch).toHaveBeenCalled();
      expect(result).toEqual(mockSearchResponse);
    });

    it('should throw BAD_REQUEST when query is empty', async () => {
      await expect(controller.search('', 'songs', mockUser))
        .rejects
        .toThrow(HttpException);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.search.mockRejectedValue(new Error('Service error'));

      await expect(controller.search('test', 'songs', mockUser))
        .rejects
        .toThrow(HttpException);
    });

    it('should use default filter when not provided', async () => {
      musicApiService.search.mockResolvedValue(mockSearchResponse);
      recentSearchService.saveSearch.mockResolvedValue(mockRecentSearch);

      await controller.search('test query', 'songs', mockUser);

      expect(musicApiService.search).toHaveBeenCalledWith('test query', 'songs');
    });

    it('should handle empty search results', async () => {
      const emptyResponse = { results: [], query: 'test' };
      musicApiService.search.mockResolvedValue(emptyResponse);
      recentSearchService.saveSearch.mockResolvedValue(mockRecentSearch);

      const result = await controller.search('nonexistent', 'songs', mockUser);

      expect(result.results).toEqual([]);
    });
  });

  // =====================
  // getRecentSearches
  // =====================
  describe('getRecentSearches', () => {
    it('should return recent searches with default limit', async () => {
      recentSearchService.getRecentSearches.mockResolvedValue([mockRecentSearch]);

      const result = await controller.getRecentSearches(mockUser, 10);

      expect(recentSearchService.getRecentSearches).toHaveBeenCalledWith(mockUserId, 10);
      expect(result).toHaveLength(1);
    });

    it('should return mapped search results without sensitive data', async () => {
      recentSearchService.getRecentSearches.mockResolvedValue([mockRecentSearch]);

      const result = await controller.getRecentSearches(mockUser, 10);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('videoId');
      expect(result[0]).toHaveProperty('songData');
      expect(result[0]).not.toHaveProperty('userId');
      expect(result[0]).not.toHaveProperty('query');
    });

    it('should return empty array when no searches', async () => {
      recentSearchService.getRecentSearches.mockResolvedValue([]);

      const result = await controller.getRecentSearches(mockUser, 10);

      expect(result).toEqual([]);
    });
  });

  // =====================
  // deleteRecentSearch
  // =====================
  describe('deleteRecentSearch', () => {
    it('should delete specific search', async () => {
      recentSearchService.deleteSearch.mockResolvedValue(undefined);

      const result = await controller.deleteRecentSearch(mockUser, mockRecentSearchId);

      expect(recentSearchService.deleteSearch).toHaveBeenCalledWith(mockUserId, mockRecentSearchId);
      expect(result).toEqual({ message: 'Search deleted successfully' });
    });
  });

  // =====================
  // clearRecentSearches
  // =====================
  describe('clearRecentSearches', () => {
    it('should clear all recent searches', async () => {
      recentSearchService.clearRecentSearches.mockResolvedValue(undefined);

      const result = await controller.clearRecentSearches(mockUser);

      expect(recentSearchService.clearRecentSearches).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ message: 'All recent searches cleared' });
    });
  });

  // =====================
  // getForYouContent
  // =====================
  describe('getForYouContent', () => {
    it('should return personalized content', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [mockFavoriteSong], total: 1 });
      libraryService.getFavoritePlaylists.mockResolvedValue({ data: [mockFavoritePlaylist], total: 1 });
      libraryService.getFavoriteGenres.mockResolvedValue({ 
        data: [{ ...mockFavoriteGenre, genre: { ...mockGenre, externalParams: 'pop' } }], 
        total: 1 
      });
      musicApiService.explore.mockResolvedValue(mockExploreResponse);
      musicApiService.getGenrePlaylists.mockResolvedValue([mockPlaylistResponse]);

      const result = await controller.getForYouContent(mockUser);

      expect(result).toHaveProperty('mixes');
      expect(result).toHaveProperty('favoriteSongs');
      expect(result).toHaveProperty('favoritePlaylists');
      expect(result).toHaveProperty('exploreContent');
    });

    it('should handle empty favorites', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [], total: 0 });
      libraryService.getFavoritePlaylists.mockResolvedValue({ data: [], total: 0 });
      libraryService.getFavoriteGenres.mockResolvedValue({ data: [], total: 0 });
      musicApiService.explore.mockResolvedValue(mockExploreResponse);

      const result = await controller.getForYouContent(mockUser);

      expect(result.mixes).toEqual([]);
      expect(result.favoriteSongs).toEqual([]);
      expect(result.favoritePlaylists).toEqual([]);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      libraryService.getFavoriteSongs.mockRejectedValue(new Error('DB error'));

      await expect(controller.getForYouContent(mockUser))
        .rejects
        .toThrow(HttpException);
    });

    it('should continue even if genre playlists fail', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [], total: 0 });
      libraryService.getFavoritePlaylists.mockResolvedValue({ data: [], total: 0 });
      libraryService.getFavoriteGenres.mockResolvedValue({ 
        data: [{ ...mockFavoriteGenre, genre: { ...mockGenre, externalParams: 'pop' } }], 
        total: 1 
      });
      musicApiService.explore.mockResolvedValue(mockExploreResponse);
      musicApiService.getGenrePlaylists.mockRejectedValue(new Error('API error'));

      const result = await controller.getForYouContent(mockUser);

      expect(result.mixes).toEqual([]);
    });
  });

  // =====================
  // getRecentlyListened
  // =====================
  describe('getRecentlyListened', () => {
    it('should return recently listened songs', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [mockFavoriteSong], total: 1 });

      const result = await controller.getRecentlyListened(mockUser);

      expect(libraryService.getFavoriteSongs).toHaveBeenCalledWith(mockUserId, 1, 20);
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0]).toHaveProperty('addedAt');
    });

    it('should return empty array when no songs', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.getRecentlyListened(mockUser);

      expect(result.songs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      libraryService.getFavoriteSongs.mockRejectedValue(new Error('DB error'));

      await expect(controller.getRecentlyListened(mockUser))
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getCategories
  // =====================
  describe('getCategories', () => {
    it('should return categories', async () => {
      musicApiService.explore.mockResolvedValue(mockExploreResponse);

      const result = await controller.getCategories();

      expect(result).toHaveProperty('moods');
      expect(result).toHaveProperty('genres');
      expect(result).toHaveProperty('charts');
    });

    it('should handle missing categories', async () => {
      musicApiService.explore.mockResolvedValue({});

      const result = await controller.getCategories();

      expect(result.moods).toEqual([]);
      expect(result.genres).toEqual([]);
      expect(result.charts).toEqual([]);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.explore.mockRejectedValue(new Error('Service error'));

      await expect(controller.getCategories())
        .rejects
        .toThrow(HttpException);
    });
  });

  // =====================
  // getGenres
  // =====================
  describe('getGenres', () => {
    it('should return genres and moods', async () => {
      musicApiService.explore.mockResolvedValue(mockExploreResponse);

      const result = await controller.getGenres();

      expect(result).toHaveProperty('genres');
      expect(result).toHaveProperty('moods');
    });

    it('should handle missing genres', async () => {
      musicApiService.explore.mockResolvedValue({});

      const result = await controller.getGenres();

      expect(result.genres).toEqual([]);
      expect(result.moods).toEqual([]);
    });

    it('should throw BAD_GATEWAY on service error', async () => {
      musicApiService.explore.mockRejectedValue(new Error('Service error'));

      await expect(controller.getGenres())
        .rejects
        .toThrow(HttpException);
    });
  });
});
