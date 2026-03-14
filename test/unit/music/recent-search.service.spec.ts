import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  let dataSource: jest.Mocked<DataSource>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecentSearchService,
        {
          provide: getRepositoryToken(RecentSearch),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RecentSearchService>(RecentSearchService);
    repository = module.get(getRepositoryToken(RecentSearch));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // saveSearch
  // =====================
  describe('saveSearch', () => {
    it('should create new search with normalized (lowercase) query', async () => {
      const query = 'NEW SEARCH';
      const normalizedQuery = 'new search';
      const filter = 'songs';

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        id: 'new-search-id',
        userId: mockUserId,
        query: normalizedQuery,
        filter,
        searchCount: 1,
        videoId: null,
        songData: null,
        createdAt: new Date(),
        lastSearchedAt: new Date(),
      } as RecentSearch);

      const result = await service.saveSearch(mockUserId, query, filter);

      // Verificar que se normalizó la query a lowercase
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, normalizedQuery]),
      );
      expect(result.query).toBe(normalizedQuery);
    });

    it('should normalize query with trim and lowercase', async () => {
      const query = '  BAD BUNNY  ';
      const normalizedQuery = 'bad bunny';

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        ...mockRecentSearch,
        query: normalizedQuery,
      } as RecentSearch);

      await service.saveSearch(mockUserId, query);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, normalizedQuery]),
      );
    });

    it('should use upsert for atomic operation', async () => {
      const query = 'test query';
      const normalizedQuery = 'test query';

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(mockRecentSearch as RecentSearch);

      await service.saveSearch(mockUserId, query);

      // Verificar que se llamó a dataSource.query con el raw SQL de upsert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining([mockUserId, normalizedQuery]),
      );
    });

    it('should NOT save videoId and songData (saved only when user selects)', async () => {
      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        userId: mockUserId,
        query: 'test',
        filter: 'songs',
        searchCount: 1,
        videoId: null,
        songData: null,
      } as RecentSearch);

      const result = await service.saveSearch(mockUserId, 'test', 'songs');

      // saveSearch solo guarda la query, no videoId/songData
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, 'test', 'songs']),
      );
      expect(result.videoId).toBeNull();
      expect(result.songData).toBeNull();
    });

    it('should use default filter when not provided', async () => {
      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(mockRecentSearch as RecentSearch);

      await service.saveSearch(mockUserId, 'test query');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, 'test query', 'songs']),
      );
    });
  });

  // =====================
  // updateSelectedSong
  // =====================
  describe('updateSelectedSong', () => {
    it('should update videoId and songData for existing search', async () => {
      const query = 'bad bunny';
      const normalizedQuery = 'bad bunny';
      const songData = { title: 'Tití Me Preguntó', artist: 'Bad Bunny' };

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        ...mockRecentSearch,
        query: normalizedQuery,
        videoId: mockVideoId,
        songData,
      } as RecentSearch);

      const result = await service.updateSelectedSong(
        mockUserId,
        query,
        mockVideoId,
        songData,
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, normalizedQuery, mockVideoId]),
      );
      expect(result.videoId).toBe(mockVideoId);
      expect(result.songData).toEqual(songData);
    });

    it('should normalize query when updating selected song', async () => {
      const query = '  BAD BUNNY  ';
      const normalizedQuery = 'bad bunny';
      const songData = { title: 'Test Song' };

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        ...mockRecentSearch,
        query: normalizedQuery,
      } as RecentSearch);

      await service.updateSelectedSong(mockUserId, query, mockVideoId, songData);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockUserId, normalizedQuery, mockVideoId]),
      );
    });

    it('should create search if not exists (upsert)', async () => {
      const query = 'new search';
      const songData = { title: 'New Song' };

      mockDataSource.query.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue({
        id: 'new-id',
        userId: mockUserId,
        query,
        filter: 'songs',
        videoId: mockVideoId,
        songData,
        createdAt: new Date(),
        lastSearchedAt: new Date(),
      } as RecentSearch);

      const result = await service.updateSelectedSong(
        mockUserId,
        query,
        mockVideoId,
        songData,
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining([mockUserId, query, mockVideoId]),
      );
      expect(result.videoId).toBe(mockVideoId);
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
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(searches);
    });

    it('should return recent searches with custom startIndex and limit', async () => {
      const searches = [mockRecentSearch];
      mockRepository.find.mockResolvedValue(searches);

      const result = await service.getRecentSearches(mockUserId, 5, 15);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { lastSearchedAt: 'DESC' },
        skip: 5,
        take: 15,
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

      const result = await service.getRecentSearches(mockUserId, 0, 20);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { lastSearchedAt: 'DESC' },
          skip: 0,
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
