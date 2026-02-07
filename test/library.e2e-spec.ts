import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('LibraryController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Register and login to get token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `library-test-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Library',
        lastName: 'Test',
      });

    if (registerResponse.status === 201) {
      accessToken = registerResponse.body.accessToken;
      userId = registerResponse.body.user?.id;
    } else {
      // If registration fails, try login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'library-test@example.com',
          password: 'password123',
        });
      accessToken = loginResponse.body.accessToken;
      userId = loginResponse.body.user?.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /library/summary', () => {
    it('should get library summary with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/library/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('favoriteSongs');
          expect(res.body).toHaveProperty('favoritePlaylists');
          expect(res.body).toHaveProperty('favoriteGenres');
          expect(typeof res.body.favoriteSongs).toBe('number');
          expect(typeof res.body.favoritePlaylists).toBe('number');
          expect(typeof res.body.favoriteGenres).toBe('number');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/library/summary')
        .expect(401);
    });
  });

  describe('POST /library/songs', () => {
    it('should add favorite song with videoId', () => {
      return request(app.getHttpServer())
        .post('/api/library/songs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          videoId: 'test-video-id-123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should fail without videoId or songId', () => {
      return request(app.getHttpServer())
        .post('/api/library/songs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .post('/api/library/songs')
        .send({
          videoId: 'test-video-id-123',
        })
        .expect(401);
    });
  });

  describe('GET /library/songs', () => {
    it('should get favorite songs with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/library/songs')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/library/songs')
        .expect(401);
    });
  });

  describe('POST /library/playlists', () => {
    it('should add favorite playlist with externalPlaylistId', () => {
      return request(app.getHttpServer())
        .post('/api/library/playlists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          externalPlaylistId: 'test-playlist-id-123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should fail without playlistId or externalPlaylistId', () => {
      return request(app.getHttpServer())
        .post('/api/library/playlists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /library/playlists', () => {
    it('should get favorite playlists with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/library/playlists')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /library/genres', () => {
    it('should add favorite genre with externalParams', () => {
      return request(app.getHttpServer())
        .post('/api/library/genres')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          externalParams: 'rock',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should fail without genreId or externalParams', () => {
      return request(app.getHttpServer())
        .post('/api/library/genres')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /library/genres', () => {
    it('should get favorite genres with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/library/genres')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
