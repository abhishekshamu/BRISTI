import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

/**
 * GoogleService — verifies Google Identity Services ID tokens (credential)
 * issued to the storefront's Google Client ID. Tokens are verified against
 * Google's public keys and the audience is pinned to GOOGLE_CLIENT_ID so a
 * token minted for another application can never be accepted.
 */
export class GoogleService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID || '';
  private readonly client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(this.clientId);
  }

  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  async verifyIdToken(credential: string): Promise<GoogleProfile> {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error('Google token payload is missing a subject identifier');
    }

    return {
      sub: payload.sub,
      email: payload.email || '',
      emailVerified: Boolean(payload.email_verified),
      name: payload.name || '',
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
    };
  }
}
