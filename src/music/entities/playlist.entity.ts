import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Song } from './song.entity';

@Entity('playlists')
@Index(['userId', 'name'])
@Index(['externalPlaylistId'], { unique: true, where: '"externalPlaylistId" IS NOT NULL' })
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalPlaylistId: string | null; // playlistId del servicio externo

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: 'uuid' })
  userId: string; // Creador de la playlist

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToMany(() => Song, { cascade: false })
  @JoinTable({
    name: 'playlist_songs',
    joinColumn: { name: 'playlistId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'songId', referencedColumnName: 'id' },
  })
  songs: Song[];

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  playCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
