import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('recent_searches')
@Index(['userId', 'query'], { unique: true })
@Index(['userId', 'createdAt'])
@Index(['userId', 'lastSearchedAt'])
@Index(['lastSearchedAt'])
export class RecentSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  query: string;

  @Column({ type: 'varchar', length: 50, default: 'songs' })
  filter: string; // songs, playlists, albums, etc.

  @Column({ type: 'int', default: 1 })
  searchCount: number; // Contador de veces que se ha buscado

  @Column({ type: 'varchar', length: 255, nullable: true })
  videoId: string | null; // videoId de la primera canción encontrada

  @Column({ type: 'jsonb', nullable: true })
  songData: any | null; // Información completa de la primera canción encontrada

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSearchedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
