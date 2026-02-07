import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MusicApiService } from '../src/music/services/music-api.service';
import { of } from 'rxjs';

// Mock data
const mockExploreResponse = {
  moods: [{ name: 'Happy', params: 'happy' }],
  genres: [{ name: 'Rock', params: 'rock' }],
  charts: [{ title: 'Song 1', videoId: 'vid1', artist: 'Artist 1' }],
};

const mockSearchResponse = {
  results: [
    {
      videoId: 'vid1',
      title: 'Song 1',
      artists: [{ name: 'Artist 1', id: 'artist1' }],
      duration: '3:00',
      duration_seconds: 180,
    },
  ],
  query: 'rock',
};

const mockPlaylistResponse = {
  playlistId: 'playlist1',
  title: 'Test Playlist',
  description: 'Test Description',
  songs: [
    { videoId: 'vid1', title: 'Song 1', artist: 'Artist 1', duration: 180 },
  ],
};

describe('MusicController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let musicApiService: MusicApiService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MusicApiService)
      .useValue({
        explore: jest.fn().mockResolvedValue(mockExploreResponse),
        getMoodPlaylists: jest.fn().mockResolvedValue([mockPlaylistResponse]),
        getGenrePlaylists: jest.fn().mockResolvedValue([mockPlaylistResponse]),
        getPlaylist: jest.fn().mockResolvedValue(mockPlaylistResponse),
        getStreamUrl: jest.fn().mockResolvedValue({ streamUrl: 'http://stream.url' }),
        search: jest.fn().mockResolvedValue(mockSearchResponse),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    musicApiService = moduleFixture.get<MusicApiService>(MusicApiService);

    // Register and login to get token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `music-test-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Music',
        lastName: 'Test',
      });

    accessToken = registerResponse.body.accessToken;
  }, 30000); // Aumentar timeout a 30 segundos

  afterAll(async () => {
    await app.close();
  });

  describe('GET /music/explore', () => {
    it('should get explore content with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/explore')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/explore')
        .expect(401);
    });
  });

  describe('GET /music/search', () => {
    it('should search music with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/search')
        .query({ q: 'rock', filter: 'songs' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should fail without query parameter', () => {
      return request(app.getHttpServer())
        .get('/api/music/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/search')
        .query({ q: 'rock' })
        .expect(401);
    });
  });

  describe('GET /music/recent-searches', () => {
    it('should get recent searches with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/recent-searches')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/recent-searches')
        .expect(401);
    });
  });

  describe('DELETE /music/recent-searches', () => {
    it('should clear recent searches with valid token', () => {
      return request(app.getHttpServer())
        .delete('/api/music/recent-searches')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    }, 10000); // Timeout de 10 segundos

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .delete('/api/music/recent-searches')
        .expect(401);
    }, 10000);
  });

  describe('GET /music/for-you', () => {
    it('should get for you content with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/for-you')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    }, 10000); // Timeout de 10 segundos

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/for-you')
        .expect(401);
    }, 10000);
  });

  describe('GET /music/recently-listened', () => {
    it('should get recently listened with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/recently-listened')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body).toHaveProperty('songs');
          expect(Array.isArray(res.body.songs)).toBe(true);
        });
    }, 10000);

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/recently-listened')
        .expect(401);
    }, 10000);
  });

  describe('GET /music/categories', () => {
    it('should get categories with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    }, 10000);

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/categories')
        .expect(401);
    }, 10000);
  });

  describe('GET /music/genres', () => {
    it('should get genres with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/music/genres')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    }, 10000);

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/music/genres')
        .expect(401);
    }, 10000);
  });
});
