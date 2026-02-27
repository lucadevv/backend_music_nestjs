import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { LibraryService } from '../../../src/library/library.service';
import { FavoriteSong } from '../../../src/library/entities/favorite-song.entity';
import { FavoritePlaylist } from '../../../src/library/entities/favorite-playlist.entity';
import { FavoriteGenre } from '../../../src/library/entities/favorite-genre.entity';
import { Song } from '../../../src/music/entities/song.entity';
import { Playlist } from '../../../src/music/entities/playlist.entity';
import { Genre } from '../../../src/music/entities/genre.entity';
import { User } from '../../../src/users/entities/user.entity';
import { MusicApiService } from '../../../src/music/services/music-api.service';
import {
  mockUserId,
  mockSongId,
  mockVideoId,
  mockSong,
  mockSongMinimal,
  mockPlaylistId,
  mockExternalPlaylistId,
  mockPlaylist,
  mockGenreId,
  mockExternalParams,
  mockGenre,
  mockFavoriteSong,
  mockFavoritePlaylist,
  mockFavoriteGenre,
  mockPlaylistResponse,
} from '../../utils/mocks';

describe('LibraryService', () => {
  let service: LibraryService;
  let favoriteSongRepo: jest.Mocked<Repository<FavoriteSong>>;
  let favoritePlaylistRepo: jest.Mocked<Repository<FavoritePlaylist>>;
  let favoriteGenreRepo: jest.Mocked<Repository<FavoriteGenre>>;
  let songRepo: jest.Mocked<Repository<Song>>;
  let playlistRepo: jest.Mocked<Repository<Playlist>>;
  let genreRepo: jest.Mocked<Repository<Genre>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let musicApiService: jest.Mocked<MusicApiService>;

  const createMockRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        {
          provide: getRepositoryToken(FavoriteSong),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(FavoritePlaylist),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(FavoriteGenre),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(Song),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(Playlist),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(Genre),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepo(),
        },
        {
          provide: MusicApiService,
          useValue: {
            getPlaylist: jest.fn(),
            getStreamUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    favoriteSongRepo = module.get(getRepositoryToken(FavoriteSong));
    favoritePlaylistRepo = module.get(getRepositoryToken(FavoritePlaylist));
    favoriteGenreRepo = module.get(getRepositoryToken(FavoriteGenre));
    songRepo = module.get(getRepositoryToken(Song));
    playlistRepo = module.get(getRepositoryToken(Playlist));
    genreRepo = module.get(getRepositoryToken(Genre));
    userRepo = module.get(getRepositoryToken(User));
    musicApiService = module.get(MusicApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // addFavoriteSong
  // =====================
  describe('addFavoriteSong', () => {
    it('should add song to favorites with videoId', async () => {
      songRepo.findOne.mockResolvedValue(null);
      songRepo.create.mockReturnValue(mockSongMinimal);
      songRepo.save.mockResolvedValue(mockSongMinimal);
      favoriteSongRepo.findOne.mockResolvedValue(null);
      favoriteSongRepo.create.mockReturnValue(mockFavoriteSong);
      favoriteSongRepo.save.mockResolvedValue(mockFavoriteSong);
      songRepo.increment.mockResolvedValue({} as any);
      favoriteSongRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteSong);

      const result = await service.addFavoriteSong(mockUserId, undefined, mockVideoId);

      expect(songRepo.findOne).toHaveBeenCalledWith({ where: { videoId: mockVideoId } });
      expect(songRepo.create).toHaveBeenCalled();
      expect(favoriteSongRepo.save).toHaveBeenCalled();
    });

    it('should add song to favorites with songId', async () => {
      songRepo.findOne.mockResolvedValue(mockSong);
      favoriteSongRepo.findOne.mockResolvedValue(null);
      favoriteSongRepo.create.mockReturnValue(mockFavoriteSong);
      favoriteSongRepo.save.mockResolvedValue(mockFavoriteSong);
      songRepo.increment.mockResolvedValue({} as any);
      favoriteSongRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteSong);

      const result = await service.addFavoriteSong(mockUserId, mockSongId);

      expect(songRepo.findOne).toHaveBeenCalledWith({ where: { id: mockSongId } });
    });

    it('should throw BadRequestException when neither songId nor videoId provided', async () => {
      await expect(service.addFavoriteSong(mockUserId))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when song not found by songId', async () => {
      songRepo.findOne.mockResolvedValue(null);

      await expect(service.addFavoriteSong(mockUserId, 'nonexistent-id'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when song already in favorites', async () => {
      songRepo.findOne.mockResolvedValue(mockSong);
      favoriteSongRepo.findOne.mockResolvedValue(mockFavoriteSong);

      await expect(service.addFavoriteSong(mockUserId, mockSongId))
        .rejects
        .toThrow(ConflictException);
    });

    it('should increment likeCount when adding favorite', async () => {
      songRepo.findOne.mockResolvedValue(mockSong);
      favoriteSongRepo.findOne.mockResolvedValue(null);
      favoriteSongRepo.create.mockReturnValue(mockFavoriteSong);
      favoriteSongRepo.save.mockResolvedValue(mockFavoriteSong);
      songRepo.increment.mockResolvedValue({} as any);
      favoriteSongRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteSong);

      await service.addFavoriteSong(mockUserId, mockSongId);

      expect(songRepo.increment).toHaveBeenCalledWith({ id: mockSongId }, 'likeCount', 1);
    });

    it('should use existing song when videoId matches', async () => {
      const existingSong = mockSong;
      songRepo.findOne.mockResolvedValue(existingSong);
      favoriteSongRepo.findOne.mockResolvedValue(null);
      favoriteSongRepo.create.mockReturnValue(mockFavoriteSong);
      favoriteSongRepo.save.mockResolvedValue(mockFavoriteSong);
      songRepo.increment.mockResolvedValue({} as any);
      favoriteSongRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteSong);

      await service.addFavoriteSong(mockUserId, undefined, mockVideoId);

      expect(songRepo.create).not.toHaveBeenCalled();
    });
  });

  // =====================
  // removeFavoriteSong
  // =====================
  describe('removeFavoriteSong', () => {
    it('should remove song from favorites', async () => {
      favoriteSongRepo.findOne.mockResolvedValue(mockFavoriteSong);
      favoriteSongRepo.remove.mockResolvedValue(mockFavoriteSong);
      songRepo.decrement.mockResolvedValue({} as any);

      await service.removeFavoriteSong(mockUserId, mockSongId);

      expect(favoriteSongRepo.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, songId: mockSongId },
      });
      expect(favoriteSongRepo.remove).toHaveBeenCalledWith(mockFavoriteSong);
    });

    it('should throw NotFoundException when song not in favorites', async () => {
      favoriteSongRepo.findOne.mockResolvedValue(null);

      await expect(service.removeFavoriteSong(mockUserId, mockSongId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should decrement likeCount when removing favorite', async () => {
      favoriteSongRepo.findOne.mockResolvedValue(mockFavoriteSong);
      favoriteSongRepo.remove.mockResolvedValue(mockFavoriteSong);
      songRepo.decrement.mockResolvedValue({} as any);

      await service.removeFavoriteSong(mockUserId, mockSongId);

      expect(songRepo.decrement).toHaveBeenCalledWith({ id: mockSongId }, 'likeCount', 1);
    });
  });

  // =====================
  // getFavoriteSongs
  // =====================
  describe('getFavoriteSongs', () => {
    it('should return paginated favorite songs', async () => {
      const favorites = [mockFavoriteSong];
      favoriteSongRepo.findAndCount.mockResolvedValue([favorites, 1]);

      const result = await service.getFavoriteSongs(mockUserId, 1, 20);

      expect(favoriteSongRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['song', 'song.genre'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(favorites);
      expect(result.total).toBe(1);
    });

    it('should return empty array when no favorites', async () => {
      favoriteSongRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getFavoriteSongs(mockUserId, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      favoriteSongRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getFavoriteSongs(mockUserId, 2, 10);

      expect(favoriteSongRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should use default pagination values', async () => {
      favoriteSongRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getFavoriteSongs(mockUserId);

      expect(favoriteSongRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  // =====================
  // isSongFavorite
  // =====================
  describe('isSongFavorite', () => {
    it('should return true when song is favorite', async () => {
      favoriteSongRepo.findOne.mockResolvedValue(mockFavoriteSong);

      const result = await service.isSongFavorite(mockUserId, mockSongId);

      expect(result).toBe(true);
    });

    it('should return false when song is not favorite', async () => {
      favoriteSongRepo.findOne.mockResolvedValue(null);

      const result = await service.isSongFavorite(mockUserId, mockSongId);

      expect(result).toBe(false);
    });
  });

  // =====================
  // addFavoritePlaylist
  // =====================
  describe('addFavoritePlaylist', () => {
    it('should add playlist to favorites with playlistId', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      favoritePlaylistRepo.findOne.mockResolvedValue(null);
      favoritePlaylistRepo.create.mockReturnValue(mockFavoritePlaylist);
      favoritePlaylistRepo.save.mockResolvedValue(mockFavoritePlaylist);
      playlistRepo.increment.mockResolvedValue({} as any);
      favoritePlaylistRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoritePlaylist);

      const result = await service.addFavoritePlaylist(mockUserId, mockPlaylistId);

      expect(playlistRepo.findOne).toHaveBeenCalledWith({ where: { id: mockPlaylistId } });
    });

    it('should add playlist to favorites with externalPlaylistId', async () => {
      playlistRepo.findOne.mockResolvedValue(null);
      musicApiService.getPlaylist.mockResolvedValue(mockPlaylistResponse);
      playlistRepo.create.mockReturnValue(mockPlaylist);
      playlistRepo.save.mockResolvedValue(mockPlaylist);
      songRepo.findOne.mockResolvedValue(mockSong);
      songRepo.save.mockResolvedValue(mockSong);
      songRepo.update.mockResolvedValue({} as any);
      favoritePlaylistRepo.findOne.mockResolvedValue(null);
      favoritePlaylistRepo.create.mockReturnValue(mockFavoritePlaylist);
      favoritePlaylistRepo.save.mockResolvedValue(mockFavoritePlaylist);
      playlistRepo.increment.mockResolvedValue({} as any);
      favoritePlaylistRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoritePlaylist);

      const result = await service.addFavoritePlaylist(mockUserId, undefined, mockExternalPlaylistId);

      expect(musicApiService.getPlaylist).toHaveBeenCalledWith(mockExternalPlaylistId);
    });

    it('should throw BadRequestException when neither playlistId nor externalPlaylistId provided', async () => {
      await expect(service.addFavoritePlaylist(mockUserId))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findOne.mockResolvedValue(null);

      await expect(service.addFavoritePlaylist(mockUserId, 'nonexistent-id'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when playlist already in favorites', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      favoritePlaylistRepo.findOne.mockResolvedValue(mockFavoritePlaylist);

      await expect(service.addFavoritePlaylist(mockUserId, mockPlaylistId))
        .rejects
        .toThrow(ConflictException);
    });

    it('should create basic playlist when external API fails', async () => {
      playlistRepo.findOne.mockResolvedValue(null);
      musicApiService.getPlaylist.mockRejectedValue(new Error('API error'));
      playlistRepo.create.mockReturnValue(mockPlaylist);
      playlistRepo.save.mockResolvedValue(mockPlaylist);
      favoritePlaylistRepo.findOne.mockResolvedValue(null);
      favoritePlaylistRepo.create.mockReturnValue(mockFavoritePlaylist);
      favoritePlaylistRepo.save.mockResolvedValue(mockFavoritePlaylist);
      playlistRepo.increment.mockResolvedValue({} as any);
      favoritePlaylistRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoritePlaylist);

      await service.addFavoritePlaylist(mockUserId, undefined, mockExternalPlaylistId);

      // Should create a basic playlist with default name
      expect(playlistRepo.create).toHaveBeenCalled();
    });
  });

  // =====================
  // removeFavoritePlaylist
  // =====================
  describe('removeFavoritePlaylist', () => {
    it('should remove playlist from favorites', async () => {
      favoritePlaylistRepo.findOne.mockResolvedValue(mockFavoritePlaylist);
      favoritePlaylistRepo.remove.mockResolvedValue(mockFavoritePlaylist);
      playlistRepo.decrement.mockResolvedValue({} as any);

      await service.removeFavoritePlaylist(mockUserId, mockPlaylistId);

      expect(favoritePlaylistRepo.remove).toHaveBeenCalledWith(mockFavoritePlaylist);
      expect(playlistRepo.decrement).toHaveBeenCalledWith({ id: mockPlaylistId }, 'likeCount', 1);
    });

    it('should throw NotFoundException when playlist not in favorites', async () => {
      favoritePlaylistRepo.findOne.mockResolvedValue(null);

      await expect(service.removeFavoritePlaylist(mockUserId, mockPlaylistId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  // =====================
  // getFavoritePlaylists
  // =====================
  describe('getFavoritePlaylists', () => {
    it('should return paginated favorite playlists', async () => {
      const favorites = [mockFavoritePlaylist];
      favoritePlaylistRepo.findAndCount.mockResolvedValue([favorites, 1]);

      const result = await service.getFavoritePlaylists(mockUserId, 1, 20);

      expect(favoritePlaylistRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['playlist', 'playlist.user', 'playlist.songs'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(favorites);
      expect(result.total).toBe(1);
    });

    it('should return empty array when no favorites', async () => {
      favoritePlaylistRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getFavoritePlaylists(mockUserId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =====================
  // isPlaylistFavorite
  // =====================
  describe('isPlaylistFavorite', () => {
    it('should return true when playlist is favorite', async () => {
      favoritePlaylistRepo.findOne.mockResolvedValue(mockFavoritePlaylist);

      const result = await service.isPlaylistFavorite(mockUserId, mockPlaylistId);

      expect(result).toBe(true);
    });

    it('should return false when playlist is not favorite', async () => {
      favoritePlaylistRepo.findOne.mockResolvedValue(null);

      const result = await service.isPlaylistFavorite(mockUserId, mockPlaylistId);

      expect(result).toBe(false);
    });
  });

  // =====================
  // addFavoriteGenre
  // =====================
  describe('addFavoriteGenre', () => {
    it('should add genre to favorites with genreId', async () => {
      genreRepo.findOne.mockResolvedValue(mockGenre);
      favoriteGenreRepo.findOne.mockResolvedValue(null);
      favoriteGenreRepo.create.mockReturnValue(mockFavoriteGenre);
      favoriteGenreRepo.save.mockResolvedValue(mockFavoriteGenre);
      favoriteGenreRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteGenre);

      const result = await service.addFavoriteGenre(mockUserId, mockGenreId);

      expect(genreRepo.findOne).toHaveBeenCalledWith({ where: { id: mockGenreId } });
    });

    it('should add genre to favorites with externalParams', async () => {
      genreRepo.findOne.mockResolvedValue(null);
      genreRepo.create.mockReturnValue(mockGenre);
      genreRepo.save.mockResolvedValue(mockGenre);
      favoriteGenreRepo.findOne.mockResolvedValue(null);
      favoriteGenreRepo.create.mockReturnValue(mockFavoriteGenre);
      favoriteGenreRepo.save.mockResolvedValue(mockFavoriteGenre);
      favoriteGenreRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteGenre);

      const result = await service.addFavoriteGenre(
        mockUserId,
        undefined,
        mockExternalParams,
        'Pop',
      );

      expect(genreRepo.create).toHaveBeenCalledWith({
        externalParams: mockExternalParams,
        name: 'Pop',
      });
    });

    it('should throw BadRequestException when neither genreId nor externalParams provided', async () => {
      await expect(service.addFavoriteGenre(mockUserId))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when genre not found', async () => {
      genreRepo.findOne.mockResolvedValue(null);

      await expect(service.addFavoriteGenre(mockUserId, 'nonexistent-id'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when genre already in favorites', async () => {
      genreRepo.findOne.mockResolvedValue(mockGenre);
      favoriteGenreRepo.findOne.mockResolvedValue(mockFavoriteGenre);

      await expect(service.addFavoriteGenre(mockUserId, mockGenreId))
        .rejects
        .toThrow(ConflictException);
    });

    it('should use existing genre when externalParams matches', async () => {
      genreRepo.findOne.mockResolvedValue(mockGenre);
      favoriteGenreRepo.findOne.mockResolvedValue(null);
      favoriteGenreRepo.create.mockReturnValue(mockFavoriteGenre);
      favoriteGenreRepo.save.mockResolvedValue(mockFavoriteGenre);
      favoriteGenreRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockFavoriteGenre);

      await service.addFavoriteGenre(mockUserId, undefined, mockExternalParams);

      expect(genreRepo.create).not.toHaveBeenCalled();
    });
  });

  // =====================
  // removeFavoriteGenre
  // =====================
  describe('removeFavoriteGenre', () => {
    it('should remove genre from favorites', async () => {
      favoriteGenreRepo.findOne.mockResolvedValue(mockFavoriteGenre);
      favoriteGenreRepo.remove.mockResolvedValue(mockFavoriteGenre);

      await service.removeFavoriteGenre(mockUserId, mockGenreId);

      expect(favoriteGenreRepo.remove).toHaveBeenCalledWith(mockFavoriteGenre);
    });

    it('should throw NotFoundException when genre not in favorites', async () => {
      favoriteGenreRepo.findOne.mockResolvedValue(null);

      await expect(service.removeFavoriteGenre(mockUserId, mockGenreId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  // =====================
  // getFavoriteGenres
  // =====================
  describe('getFavoriteGenres', () => {
    it('should return paginated favorite genres', async () => {
      const favorites = [mockFavoriteGenre];
      favoriteGenreRepo.findAndCount.mockResolvedValue([favorites, 1]);

      const result = await service.getFavoriteGenres(mockUserId, 1, 20);

      expect(favoriteGenreRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['genre'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(favorites);
      expect(result.total).toBe(1);
    });

    it('should return empty array when no favorites', async () => {
      favoriteGenreRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getFavoriteGenres(mockUserId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =====================
  // isGenreFavorite
  // =====================
  describe('isGenreFavorite', () => {
    it('should return true when genre is favorite', async () => {
      favoriteGenreRepo.findOne.mockResolvedValue(mockFavoriteGenre);

      const result = await service.isGenreFavorite(mockUserId, mockGenreId);

      expect(result).toBe(true);
    });

    it('should return false when genre is not favorite', async () => {
      favoriteGenreRepo.findOne.mockResolvedValue(null);

      const result = await service.isGenreFavorite(mockUserId, mockGenreId);

      expect(result).toBe(false);
    });
  });

  // =====================
  // getLibrarySummary
  // =====================
  describe('getLibrarySummary', () => {
    it('should return library summary with counts', async () => {
      favoriteSongRepo.count.mockResolvedValue(10);
      favoritePlaylistRepo.count.mockResolvedValue(5);
      favoriteGenreRepo.count.mockResolvedValue(3);

      const result = await service.getLibrarySummary(mockUserId);

      expect(result).toEqual({
        favoriteSongs: 10,
        favoritePlaylists: 5,
        favoriteGenres: 3,
      });
    });

    it('should return zero counts when no favorites', async () => {
      favoriteSongRepo.count.mockResolvedValue(0);
      favoritePlaylistRepo.count.mockResolvedValue(0);
      favoriteGenreRepo.count.mockResolvedValue(0);

      const result = await service.getLibrarySummary(mockUserId);

      expect(result).toEqual({
        favoriteSongs: 0,
        favoritePlaylists: 0,
        favoriteGenres: 0,
      });
    });

    it('should call count for all repositories in parallel', async () => {
      favoriteSongRepo.count.mockResolvedValue(0);
      favoritePlaylistRepo.count.mockResolvedValue(0);
      favoriteGenreRepo.count.mockResolvedValue(0);

      await service.getLibrarySummary(mockUserId);

      expect(favoriteSongRepo.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(favoritePlaylistRepo.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(favoriteGenreRepo.count).toHaveBeenCalledWith({ where: { userId: mockUserId } });
    });
  });
});
