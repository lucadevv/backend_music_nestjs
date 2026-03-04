import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecentSearch } from '../entities/recent-search.entity';

@Injectable()
export class RecentSearchService {
  constructor(
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
  ) {}

  async saveSearch(
    userId: string,
    query: string,
    filter: string = 'songs',
    videoId?: string,
    songData?: any,
  ): Promise<RecentSearch> {
    // Buscar si ya existe esta búsqueda para este usuario
    const existing = await this.recentSearchRepository.findOne({
      where: { userId, query },
    });

    if (existing) {
      // Actualizar contador, fecha, videoId y songData
      existing.searchCount += 1;
      existing.lastSearchedAt = new Date();
      existing.filter = filter;
      // Reemplazar videoId y songData con los nuevos de esta búsqueda específica
      existing.videoId = videoId || null;
      existing.songData = songData || null;
      return this.recentSearchRepository.save(existing);
    }

    // Crear nueva búsqueda
    const recentSearch = this.recentSearchRepository.create({
      userId,
      query,
      filter,
      searchCount: 1,
      videoId: videoId || null,
      songData: songData || null,
    });

    return this.recentSearchRepository.save(recentSearch);
  }

  async getRecentSearches(
    userId: string,
    startIndex: number = 0,
    limit: number = 10,
  ): Promise<RecentSearch[]> {
    return this.recentSearchRepository.find({
      where: { userId },
      order: { lastSearchedAt: 'DESC' },
      skip: startIndex,
      take: limit,
    });
  }

  async deleteSearch(userId: string, searchId: string): Promise<void> {
    const search = await this.recentSearchRepository.findOne({
      where: { id: searchId, userId },
    });

    if (search) {
      await this.recentSearchRepository.remove(search);
    }
  }

  async clearRecentSearches(userId: string): Promise<void> {
    await this.recentSearchRepository.delete({ userId });
  }
}
