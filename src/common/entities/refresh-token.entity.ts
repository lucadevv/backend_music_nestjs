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

@Entity('refresh_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar', length: 64, unique: true })
    tokenHash: string;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
