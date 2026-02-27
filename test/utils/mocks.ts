import { User, AuthProvider, UserRole } from '../../src/users/entities/user.entity';
import { RefreshToken } from '../../src/common/entities/refresh-token.entity';
import { Song } from '../../src/music/entities/song.entity';
import { Playlist } from '../../src/music/entities/playlist.entity';
import { Genre } from '../../src/music/entities/genre.entity';
import { RecentSearch } from '../../src/music/entities/recent-search.entity';
import { FavoriteSong } from '../../src/library/entities/favorite-song.entity';
import { FavoritePlaylist } from '../../src/library/entities/favorite-playlist.entity';
import { FavoriteGenre } from '../../src/library/entities/favorite-genre.entity';

// Type for creating mock functions
type MockFunction<T> = jest.Mock<T>;

// Generic mock type for services
export type MockType<T> = {
  [P in keyof T]?: MockFunction<any>;
};

// Helper to create a mock
export const createMock = <T>(): MockType<T> => ({});

// =====================
// USER MOCKS
// =====================

export const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
export const mockUserEmail = 'test@example.com';
export const mockHashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz123456';

export const mockUser: User = {
  id: mockUserId,
  email: mockUserEmail,
  password: mockHashedPassword,
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  provider: AuthProvider.EMAIL,
  providerId: null,
  role: UserRole.USER,
  isActive: true,
  isEmailVerified: false,
  lastLoginAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAdminUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

export const mockGoogleUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174002',
  email: 'google@example.com',
  password: null,
  provider: AuthProvider.GOOGLE,
  providerId: 'google-id-123',
  isEmailVerified: true,
};

export const mockAppleUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174003',
  email: 'apple@example.com',
  password: null,
  provider: AuthProvider.APPLE,
  providerId: 'apple-id-123',
  isEmailVerified: true,
};

export const mockInactiveUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174004',
  email: 'inactive@example.com',
  isActive: false,
};

// =====================
// REFRESH TOKEN MOCKS
// =====================

export const mockRefreshTokenValue = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
// SHA256 hash of mockRefreshTokenValue (first 64 chars)
export const mockTokenHash = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2a1b2c3d4e5f6g7h8';

export const mockRefreshToken: RefreshToken = {
  id: '123e4567-e89b-12d3-a456-426614174010',
  userId: mockUserId,
  user: mockUser,
  tokenHash: mockTokenHash,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  ipAddress: '127.0.0.1',
  userAgent: 'Jest Test Agent',
  createdAt: new Date(),
};

export const mockExpiredRefreshToken: RefreshToken = {
  ...mockRefreshToken,
  id: '123e4567-e89b-12d3-a456-426614174011',
  expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
};

// =====================
// SONG MOCKS
// =====================

export const mockSongId = '123e4567-e89b-12d3-a456-426614174020';
export const mockVideoId = 'abc123defgh';

export const mockSong: Song = {
  id: mockSongId,
  videoId: mockVideoId,
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  coverImage: 'https://example.com/cover.jpg',
  audioUrl: 'https://example.com/audio.mp3',
  duration: 180,
  genreId: null,
  genre: null,
  playCount: 1000,
  likeCount: 500,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSongMinimal: Song = {
  id: '123e4567-e89b-12d3-a456-426614174021',
  videoId: 'xyz789video',
  title: 'Song xyz789video',
  artist: 'Unknown',
  album: null,
  coverImage: null,
  audioUrl: null,
  duration: 0,
  genreId: null,
  genre: null,
  playCount: 0,
  likeCount: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =====================
// PLAYLIST MOCKS
// =====================

export const mockPlaylistId = '123e4567-e89b-12d3-a456-426614174030';
export const mockExternalPlaylistId = 'PL1234567890';

export const mockPlaylist: Playlist = {
  id: mockPlaylistId,
  externalPlaylistId: mockExternalPlaylistId,
  name: 'Test Playlist',
  description: 'A test playlist',
  coverImage: 'https://example.com/playlist.jpg',
  userId: mockUserId,
  user: mockUser,
  isPublic: false,
  songs: [mockSong],
  likeCount: 100,
  playCount: 500,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =====================
// GENRE MOCKS
// =====================

export const mockGenreId = '123e4567-e89b-12d3-a456-426614174040';
export const mockExternalParams = 'pop';

export const mockGenre: Genre = {
  id: mockGenreId,
  externalParams: mockExternalParams,
  name: 'Pop',
  description: 'Pop music genre',
  coverImage: 'https://example.com/genre.jpg',
  songCount: 1000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =====================
// RECENT SEARCH MOCKS
// =====================

export const mockRecentSearchId = '123e4567-e89b-12d3-a456-426614174050';

export const mockRecentSearch: RecentSearch = {
  id: mockRecentSearchId,
  userId: mockUserId,
  user: mockUser,
  query: 'test query',
  filter: 'songs',
  searchCount: 1,
  videoId: mockVideoId,
  songData: {
    title: 'Test Song',
    artist: 'Test Artist',
    videoId: mockVideoId,
  },
  createdAt: new Date(),
  lastSearchedAt: new Date(),
};

// =====================
// FAVORITE MOCKS
// =====================

export const mockFavoriteSongId = '123e4567-e89b-12d3-a456-426614174060';

export const mockFavoriteSong: FavoriteSong = {
  id: mockFavoriteSongId,
  userId: mockUserId,
  user: mockUser,
  songId: mockSongId,
  song: mockSong,
  createdAt: new Date(),
};

export const mockFavoritePlaylistId = '123e4567-e89b-12d3-a456-426614174061';

export const mockFavoritePlaylist: FavoritePlaylist = {
  id: mockFavoritePlaylistId,
  userId: mockUserId,
  user: mockUser,
  playlistId: mockPlaylistId,
  playlist: mockPlaylist,
  createdAt: new Date(),
};

export const mockFavoriteGenreId = '123e4567-e89b-12d3-a456-426614174062';

export const mockFavoriteGenre: FavoriteGenre = {
  id: mockFavoriteGenreId,
  userId: mockUserId,
  user: mockUser,
  genreId: mockGenreId,
  genre: mockGenre,
  createdAt: new Date(),
};

// =====================
// EXTERNAL API MOCKS
// =====================

export const mockExploreResponse = {
  moods: [
    { name: 'Relax', params: 'relax' },
    { name: 'Energize', params: 'energize' },
  ],
  genres: [
    { name: 'Pop', params: 'pop' },
    { name: 'Rock', params: 'rock' },
  ],
  charts: {
    top_songs: [
      {
        videoId: 'top1',
        title: 'Top Song 1',
        artist: 'Top Artist 1',
        stream_url: 'https://example.com/stream1',
        thumbnail: 'https://example.com/thumb1.jpg',
      },
    ],
    trending: [
      {
        videoId: 'trend1',
        title: 'Trending Song 1',
        artist: 'Trending Artist 1',
        stream_url: 'https://example.com/stream2',
        thumbnail: 'https://example.com/thumb2.jpg',
      },
    ],
  },
};

export const mockPlaylistResponse = {
  playlistId: mockExternalPlaylistId,
  title: 'Test Playlist',
  description: 'A test playlist from external API',
  songs: [
    {
      videoId: mockVideoId,
      title: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      stream_url: 'https://example.com/stream.mp3',
      thumbnail: 'https://example.com/thumb.jpg',
    },
  ],
};

export const mockSearchResponse = {
  results: [
    {
      videoId: mockVideoId,
      title: 'Test Song',
      artists: [{ name: 'Test Artist', id: 'artist123' }],
      album: { name: 'Test Album', id: 'album123' },
      duration: '3:00',
      duration_seconds: 180,
      views: '1M',
      thumbnails: [{ url: 'https://example.com/thumb.jpg', width: 120, height: 120 }],
      thumbnail: 'https://example.com/thumb.jpg',
      stream_url: 'https://example.com/stream.mp3',
      category: 'Songs',
      resultType: 'song',
    },
  ],
  query: 'test query',
};

export const mockStreamResponse = {
  url: 'https://example.com/stream.mp3',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 180,
  thumbnail: 'https://example.com/thumb.jpg',
};

// =====================
// JWT PAYLOAD MOCK
// =====================

export const mockJwtPayload = {
  sub: mockUserId,
  email: mockUserEmail,
  role: UserRole.USER,
};

// =====================
// GOOGLE PROFILE MOCK
// =====================

export const mockGoogleProfile = {
  id: 'google-id-123',
  emails: [{ value: 'google@example.com', verified: true }],
  name: { givenName: 'Google', familyName: 'User' },
  photos: [{ value: 'https://example.com/google-avatar.jpg' }],
};

// =====================
// APPLE PROFILE MOCK
// =====================

export const mockAppleProfile = {
  id: 'apple-id-123',
  email: 'apple@example.com',
  name: { firstName: 'Apple', lastName: 'User' },
};
