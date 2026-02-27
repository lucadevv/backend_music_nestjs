import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecentSearchService } from '../../../src/music/services/recent-search.service';
import { RecentSearch } from '../../../src/music/entities/recent-search.entity';
import {
  mockUserId,
  mockRecentSearchId,
  mockRecentSearch,
  mockVideoId,
} from '../../utils/mocks';

describe('RecentSearchService', () => {
  let service: RecentSearchService;
  let repository: jest.Mocked<Repository<RecentSearch>>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecentSearchService,
        {
          provide: getRepositoryToken(RecentSearch),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RecentSearchService>(RecentSearchService);
    repository = module.get(getRepositoryToken(RecentSearch));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // saveSearch
  // =====================
  describe('saveSearch', () => {
    it('should create new search when not exists', async () => {
      const query = 'new search';
      const filter = 'songs';
      const songData = { title: 'Test Song', artist: 'Test Artist' };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        userId: mockUserId,
        query,
        filter,
        searchCount: 1,
        videoId: mockVideoId,
        songData,
      } as RecentSearch);
      mockRepository.save.mockResolvedValue({
        id: 'new-search-id',
        userId: mockUserId,
        query,
        filter,
        searchCount: 1,
        videoId: mockVideoId,
        songData,
        createdAt: new Date(),
        lastSearchedAt: new Date(),
      } as RecentSearch);

      const result = await service.saveSearch(mockUserId, query, filter, mockVideoId, songData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, query },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        query,
        filter,
        searchCount: 1,
        videoId: mockVideoId,
        songData,
      });
      expect(result.query).toBe(query);
    });

    it('should update existing search when found', async () => {
      const query = 'existing search';
      const existingSearch: RecentSearch = {
        ...mockRecentSearch,
        query,
        searchCount: 3,
      };

      mockRepository.findOne.mockResolvedValue(existingSearch);
      mockRepository.save.mockResolvedValue({
        ...existingSearch,
        searchCount: 4,
        lastSearchedAt: new Date(),
        filter: 'playlists',
        videoId: 'new-video-id',
        songData: { title: 'New Song' },
      } as RecentSearch);

      const result = await service.saveSearch(
        mockUserId,
        query,
        'playlists',
        'new-video-id',
        { title: 'New Song' },
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, query },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.searchCount).toBe(4);
    });

    it('should update videoId and songData on existing search', async () => {
      const query = 'test query';
      const existingSearch: RecentSearch = {
        ...mockRecentSearch,
        query,
        videoId: 'old-video-id',
        songData: { title: 'Old Song' },
      };

      const newSongData = { title: 'New Song', artist: 'New Artist' };

      mockRepository.findOne.mockResolvedValue(existingSearch);
      mockRepository.save.mockImplementation(async (search) => search);

      const result = await service.saveSearch(
        mockUserId,
        query,
        'songs',
        'new-video-id',
        newSongData,
      );

      expect(result.videoId).toBe('new-video-id');
      expect(result.songData).toEqual(newSongData);
    });

    it('should handle null videoId and songData', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        userId: mockUserId,
        query: 'test',
        filter: 'songs',
        searchCount: 1,
        videoId: null,
        songData: null,
      } as RecentSearch);
      mockRepository.save.mockImplementation(async (search) => search);

      const result = await service.saveSearch(mockUserId, 'test', 'songs');

      expect(result.videoId).toBeNull();
      expect(result.songData).toBeNull();
    });

    it('should use default filter when not provided', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as RecentSearch);
      mockRepository.save.mockImplementation(async (search) => search);

      await service.saveSearch(mockUserId, 'test query');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'songs' }),
      );
    });
  });

  // =====================
  // getRecentSearches
  // =====================
  describe('getRecentSearches', () => {
    it('should return recent searches with default limit', async () => {
      const searches = [mockRecentSearch];
      mockRepository.find.mockResolvedValue(searches);

      const result = await service.getRecentSearches(mockUserId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { lastSearchedAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual(searches);
    });

    it('should return recent searches with custom limit', async () => {
      const searches = [mockRecentSearch];
      mockRepository.find.mockResolvedValue(searches);

      const result = await service.getRecentSearches(mockUserId, 5);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { lastSearchedAt: 'DESC' },
        take: 5,
      });
      expect(result).toEqual(searches);
    });

    it('should return empty array when no searches found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getRecentSearches(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return searches ordered by lastSearchedAt DESC', async () => {
      const searches = [
        { ...mockRecentSearch, id: '1', lastSearchedAt: new Date('2024-01-03') },
        { ...mockRecentSearch, id: '2', lastSearchedAt: new Date('2024-01-02') },
        { ...mockRecentSearch, id: '3', lastSearchedAt: new Date('2024-01-01') },
      ];
      mockRepository.find.mockResolvedValue(searches);

      const result = await service.getRecentSearches(mockUserId, 20);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { lastSearchedAt: 'DESC' },
          take: 20,
        }),
      );
    });
  });

  // =====================
  // deleteSearch
  // =====================
  describe('deleteSearch', () => {
    it('should delete search when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockRecentSearch);
      mockRepository.remove.mockResolvedValue(mockRecentSearch);

      await service.deleteSearch(mockUserId, mockRecentSearchId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRecentSearchId, userId: mockUserId },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockRecentSearch);
    });

    it('should not throw error when search not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteSearch(mockUserId, 'nonexistent-id'))
        .resolves
        .not
        .toThrow();

      expect(mockRepository.remove).not.toHaveBeenCalled();
    });

    it('should only delete search belonging to user', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.deleteSearch('different-user-id', mockRecentSearchId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRecentSearchId, userId: 'different-user-id' },
      });
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });

  // =====================
  // clearRecentSearches
  // =====================
  describe('clearRecentSearches', () => {
    it('should delete all searches for user', async () => {
      mockRepository.delete.mockResolvedValue({} as any);

      await service.clearRecentSearches(mockUserId);

      expect(mockRepository.delete).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should not throw error when no searches to delete', async () => {
      mockRepository.delete.mockResolvedValue({} as any);

      await expect(service.clearRecentSearches(mockUserId))
        .resolves
        .not
        .toThrow();
    });
  });
});
