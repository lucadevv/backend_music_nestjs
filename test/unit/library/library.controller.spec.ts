import { Test, TestingModule } from '@nestjs/testing';
import { LibraryController } from '../../../src/library/library.controller';
import { LibraryService } from '../../../src/library/library.service';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  mockUserId,
  mockSongId,
  mockVideoId,
  mockPlaylistId,
  mockExternalPlaylistId,
  mockGenreId,
  mockExternalParams,
  mockFavoriteSong,
  mockFavoritePlaylist,
  mockFavoriteGenre,
} from '../../utils/mocks';

describe('LibraryController', () => {
  let controller: LibraryController;
  let libraryService: jest.Mocked<LibraryService>;

  const mockUser = { userId: mockUserId };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        {
          provide: LibraryService,
          useValue: {
            addFavoriteSong: jest.fn(),
            removeFavoriteSong: jest.fn(),
            getFavoriteSongs: jest.fn(),
            isSongFavorite: jest.fn(),
            addFavoritePlaylist: jest.fn(),
            removeFavoritePlaylist: jest.fn(),
            getFavoritePlaylists: jest.fn(),
            isPlaylistFavorite: jest.fn(),
            addFavoriteGenre: jest.fn(),
            removeFavoriteGenre: jest.fn(),
            getFavoriteGenres: jest.fn(),
            isGenreFavorite: jest.fn(),
            getLibrarySummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LibraryController>(LibraryController);
    libraryService = module.get(LibraryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // SONGS
  // =====================

  describe('addFavoriteSong', () => {
    it('should add song to favorites with songId', async () => {
      libraryService.addFavoriteSong.mockResolvedValue(mockFavoriteSong);

      const result = await controller.addFavoriteSong(mockUser, { songId: mockSongId });

      expect(libraryService.addFavoriteSong).toHaveBeenCalledWith(
        mockUserId,
        mockSongId,
        undefined,
      );
      expect(result).toEqual(mockFavoriteSong);
    });

    it('should add song to favorites with videoId', async () => {
      libraryService.addFavoriteSong.mockResolvedValue(mockFavoriteSong);

      const result = await controller.addFavoriteSong(mockUser, { videoId: mockVideoId });

      expect(libraryService.addFavoriteSong).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        mockVideoId,
      );
      expect(result).toEqual(mockFavoriteSong);
    });

    it('should throw BadRequestException when neither songId nor videoId provided', async () => {
      libraryService.addFavoriteSong.mockRejectedValue(
        new BadRequestException('Either songId or videoId must be provided'),
      );

      await expect(controller.addFavoriteSong(mockUser, {}))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when song not found', async () => {
      libraryService.addFavoriteSong.mockRejectedValue(
        new NotFoundException('Song not found'),
      );

      await expect(controller.addFavoriteSong(mockUser, { songId: 'nonexistent' }))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when song already in favorites', async () => {
      libraryService.addFavoriteSong.mockRejectedValue(
        new ConflictException('Song is already in favorites'),
      );

      await expect(controller.addFavoriteSong(mockUser, { songId: mockSongId }))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('removeFavoriteSong', () => {
    it('should remove song from favorites', async () => {
      libraryService.removeFavoriteSong.mockResolvedValue(undefined);

      const result = await controller.removeFavoriteSong(mockUser, mockSongId);

      expect(libraryService.removeFavoriteSong).toHaveBeenCalledWith(mockUserId, mockSongId);
      expect(result).toEqual({ message: 'Song removed from favorites' });
    });

    it('should throw NotFoundException when song not in favorites', async () => {
      libraryService.removeFavoriteSong.mockRejectedValue(
        new NotFoundException('Song is not in favorites'),
      );

      await expect(controller.removeFavoriteSong(mockUser, mockSongId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getFavoriteSongs', () => {
    it('should return paginated favorite songs', async () => {
      const mockResponse = { data: [mockFavoriteSong], total: 1 };
      libraryService.getFavoriteSongs.mockResolvedValue(mockResponse);

      const result = await controller.getFavoriteSongs(mockUser, 1, 20);

      expect(libraryService.getFavoriteSongs).toHaveBeenCalledWith(mockUserId, 1, 20);
      expect(result).toEqual(mockResponse);
    });

    it('should use default pagination values', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [], total: 0 });

      await controller.getFavoriteSongs(mockUser, 1, 20);

      expect(libraryService.getFavoriteSongs).toHaveBeenCalledWith(mockUserId, 1, 20);
    });

    it('should return empty array when no favorites', async () => {
      libraryService.getFavoriteSongs.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.getFavoriteSongs(mockUser, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('checkSongFavorite', () => {
    it('should return true when song is favorite', async () => {
      libraryService.isSongFavorite.mockResolvedValue(true);

      const result = await controller.checkSongFavorite(mockUser, mockSongId);

      expect(libraryService.isSongFavorite).toHaveBeenCalledWith(mockUserId, mockSongId);
      expect(result).toEqual({ isFavorite: true });
    });

    it('should return false when song is not favorite', async () => {
      libraryService.isSongFavorite.mockResolvedValue(false);

      const result = await controller.checkSongFavorite(mockUser, mockSongId);

      expect(result).toEqual({ isFavorite: false });
    });
  });

  // =====================
  // PLAYLISTS
  // =====================

  describe('addFavoritePlaylist', () => {
    it('should add playlist to favorites with playlistId', async () => {
      libraryService.addFavoritePlaylist.mockResolvedValue(mockFavoritePlaylist);

      const result = await controller.addFavoritePlaylist(mockUser, { playlistId: mockPlaylistId });

      expect(libraryService.addFavoritePlaylist).toHaveBeenCalledWith(
        mockUserId,
        mockPlaylistId,
        undefined,
      );
      expect(result).toEqual(mockFavoritePlaylist);
    });

    it('should add playlist to favorites with externalPlaylistId', async () => {
      libraryService.addFavoritePlaylist.mockResolvedValue(mockFavoritePlaylist);

      const result = await controller.addFavoritePlaylist(mockUser, { 
        externalPlaylistId: mockExternalPlaylistId 
      });

      expect(libraryService.addFavoritePlaylist).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        mockExternalPlaylistId,
      );
      expect(result).toEqual(mockFavoritePlaylist);
    });

    it('should throw BadRequestException when neither playlistId nor externalPlaylistId provided', async () => {
      libraryService.addFavoritePlaylist.mockRejectedValue(
        new BadRequestException('Either playlistId or externalPlaylistId must be provided'),
      );

      await expect(controller.addFavoritePlaylist(mockUser, {}))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw ConflictException when playlist already in favorites', async () => {
      libraryService.addFavoritePlaylist.mockRejectedValue(
        new ConflictException('Playlist is already in favorites'),
      );

      await expect(controller.addFavoritePlaylist(mockUser, { playlistId: mockPlaylistId }))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('removeFavoritePlaylist', () => {
    it('should remove playlist from favorites', async () => {
      libraryService.removeFavoritePlaylist.mockResolvedValue(undefined);

      const result = await controller.removeFavoritePlaylist(mockUser, mockPlaylistId);

      expect(libraryService.removeFavoritePlaylist).toHaveBeenCalledWith(mockUserId, mockPlaylistId);
      expect(result).toEqual({ message: 'Playlist removed from favorites' });
    });

    it('should throw NotFoundException when playlist not in favorites', async () => {
      libraryService.removeFavoritePlaylist.mockRejectedValue(
        new NotFoundException('Playlist is not in favorites'),
      );

      await expect(controller.removeFavoritePlaylist(mockUser, mockPlaylistId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getFavoritePlaylists', () => {
    it('should return paginated favorite playlists', async () => {
      const mockResponse = { data: [mockFavoritePlaylist], total: 1 };
      libraryService.getFavoritePlaylists.mockResolvedValue(mockResponse);

      const result = await controller.getFavoritePlaylists(mockUser, 1, 20);

      expect(libraryService.getFavoritePlaylists).toHaveBeenCalledWith(mockUserId, 1, 20);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkPlaylistFavorite', () => {
    it('should return true when playlist is favorite', async () => {
      libraryService.isPlaylistFavorite.mockResolvedValue(true);

      const result = await controller.checkPlaylistFavorite(mockUser, mockPlaylistId);

      expect(result).toEqual({ isFavorite: true });
    });

    it('should return false when playlist is not favorite', async () => {
      libraryService.isPlaylistFavorite.mockResolvedValue(false);

      const result = await controller.checkPlaylistFavorite(mockUser, mockPlaylistId);

      expect(result).toEqual({ isFavorite: false });
    });
  });

  // =====================
  // GENRES
  // =====================

  describe('addFavoriteGenre', () => {
    it('should add genre to favorites with genreId', async () => {
      libraryService.addFavoriteGenre.mockResolvedValue(mockFavoriteGenre);

      const result = await controller.addFavoriteGenre(mockUser, { genreId: mockGenreId });

      expect(libraryService.addFavoriteGenre).toHaveBeenCalledWith(
        mockUserId,
        mockGenreId,
        undefined,
      );
      expect(result).toEqual(mockFavoriteGenre);
    });

    it('should add genre to favorites with externalParams', async () => {
      libraryService.addFavoriteGenre.mockResolvedValue(mockFavoriteGenre);

      const result = await controller.addFavoriteGenre(mockUser, { 
        externalParams: mockExternalParams,
      });

      expect(libraryService.addFavoriteGenre).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        mockExternalParams,
      );
      expect(result).toEqual(mockFavoriteGenre);
    });

    it('should throw BadRequestException when neither genreId nor externalParams provided', async () => {
      libraryService.addFavoriteGenre.mockRejectedValue(
        new BadRequestException('Either genreId or externalParams must be provided'),
      );

      await expect(controller.addFavoriteGenre(mockUser, {}))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw ConflictException when genre already in favorites', async () => {
      libraryService.addFavoriteGenre.mockRejectedValue(
        new ConflictException('Genre is already in favorites'),
      );

      await expect(controller.addFavoriteGenre(mockUser, { genreId: mockGenreId }))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('removeFavoriteGenre', () => {
    it('should remove genre from favorites', async () => {
      libraryService.removeFavoriteGenre.mockResolvedValue(undefined);

      const result = await controller.removeFavoriteGenre(mockUser, mockGenreId);

      expect(libraryService.removeFavoriteGenre).toHaveBeenCalledWith(mockUserId, mockGenreId);
      expect(result).toEqual({ message: 'Genre removed from favorites' });
    });

    it('should throw NotFoundException when genre not in favorites', async () => {
      libraryService.removeFavoriteGenre.mockRejectedValue(
        new NotFoundException('Genre is not in favorites'),
      );

      await expect(controller.removeFavoriteGenre(mockUser, mockGenreId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getFavoriteGenres', () => {
    it('should return paginated favorite genres', async () => {
      const mockResponse = { data: [mockFavoriteGenre], total: 1 };
      libraryService.getFavoriteGenres.mockResolvedValue(mockResponse);

      const result = await controller.getFavoriteGenres(mockUser, 1, 20);

      expect(libraryService.getFavoriteGenres).toHaveBeenCalledWith(mockUserId, 1, 20);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkGenreFavorite', () => {
    it('should return true when genre is favorite', async () => {
      libraryService.isGenreFavorite.mockResolvedValue(true);

      const result = await controller.checkGenreFavorite(mockUser, mockGenreId);

      expect(result).toEqual({ isFavorite: true });
    });

    it('should return false when genre is not favorite', async () => {
      libraryService.isGenreFavorite.mockResolvedValue(false);

      const result = await controller.checkGenreFavorite(mockUser, mockGenreId);

      expect(result).toEqual({ isFavorite: false });
    });
  });

  // =====================
  // SUMMARY
  // =====================

  describe('getLibrarySummary', () => {
    it('should return library summary', async () => {
      const mockSummary = {
        favoriteSongs: 10,
        favoritePlaylists: 5,
        favoriteGenres: 3,
      };
      libraryService.getLibrarySummary.mockResolvedValue(mockSummary);

      const result = await controller.getLibrarySummary(mockUser);

      expect(libraryService.getLibrarySummary).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockSummary);
    });

    it('should return zero counts when no favorites', async () => {
      const mockSummary = {
        favoriteSongs: 0,
        favoritePlaylists: 0,
        favoriteGenres: 0,
      };
      libraryService.getLibrarySummary.mockResolvedValue(mockSummary);

      const result = await controller.getLibrarySummary(mockUser);

      expect(result).toEqual(mockSummary);
    });
  });
});
