import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Song } from './song.entity';

@Entity('user_listen_history')
@Index(['userId', 'songId'])
@Index(['userId', 'createdAt'])
export class UserListenHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  songId: string;

  @ManyToOne(() => Song, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'songId' })
  song: Song;

  @CreateDateColumn()
  createdAt: Date;
}