import axios from 'axios';
import { AuthDto } from './AuthDto';
import { LOGIN_API_URL } from '../apiconfig';
import { saveSession, tokenExpiresAt } from './session';

export class AuthService {
  static async login(authDto: AuthDto, remember = false) {
    const { data } = await axios.post(LOGIN_API_URL, authDto, { timeout: 15_000 });
    if (!data || typeof data.access_token !== 'string' ||
        tokenExpiresAt(data.access_token) <= Date.now() ||
        typeof data.refresh_token !== 'string' || !data.refresh_token.trim()) {
      throw new Error('The server returned an invalid login session.');
    }
    saveSession({ accessToken: data.access_token, refreshToken: data.refresh_token,
      fullname: typeof data.fullname === 'string' ? data.fullname : authDto.username,
      email: authDto.username }, remember);
  }
}
