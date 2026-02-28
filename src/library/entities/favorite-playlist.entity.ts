import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Playlist } from '../../music/entities/playlist.entity';

@Entity('favorite_playlists')
@Unique(['userId', 'playlistId'])
@Index(['userId'])
@Index(['playlistId'])
export class FavoritePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  playlistId: string;

  @ManyToOne(() => Playlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  // Track count cacheado para evitar llamadas a YouTube
  @Column({ type: 'int', nullable: true })
  cachedTrackCount: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
