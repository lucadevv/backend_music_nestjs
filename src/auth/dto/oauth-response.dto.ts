import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseDto } from './auth-response.dto';

export class OAuthResponseDto extends AuthResponseDto {
  @ApiProperty({ description: 'Whether this is a newly created user' })
  isNewUser: boolean;
}
