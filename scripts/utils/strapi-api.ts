import { OrganizationData } from '../types';

export class StrapiAPI {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('API request failed:', error.message);
      throw error;
    }
  }

  async createOrganization(data: OrganizationData): Promise<any> {
    return this.request('/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  async findOrganizationByName(name: string): Promise<any> {
    const response = await this.request(
      `/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`,
    );
    return response.data?.[0] || null;
  }

  async createUser(data: any): Promise<any> {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async findUserByEmail(email: string): Promise<any> {
    const response = await this.request(
      `/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
    );
    return response[0] || null;
  }
}
