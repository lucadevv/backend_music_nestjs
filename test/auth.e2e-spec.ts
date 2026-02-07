import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(uniqueEmail);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
          userId = res.body.user.id;
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: '12345',
        })
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      // First registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: duplicateEmail,
          password: 'password123',
        })
        .expect(201);
      
      // Second registration with same email should fail
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: duplicateEmail,
          password: 'password123',
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const loginEmail = `login-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: loginEmail,
          password: 'password123',
        })
        .expect(201);
      
      // Then login
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with invalid credentials', async () => {
      // First register a user
      const loginEmail = `invalid-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: loginEmail,
          password: 'password123',
        })
        .expect(201);
      
      // Then try to login with wrong password
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should get user profile with valid token', async () => {
      // Register a new user and get token
      const meEmail = `me-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: meEmail,
          password: 'password123',
          firstName: 'Me',
          lastName: 'Test',
        })
        .expect(201);
      
      const token = registerResponse.body.accessToken;
      
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body.email).toBe(meEmail);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });
});
