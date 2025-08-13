import { OrganizationData, UserData } from '../types';

export class StrapiAPI {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
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
      return (await response.json()) as T;
    } catch (error: any) {
      console.error('API request failed:', error.message);
      throw error;
    }
  }

  async createOrganization(data: OrganizationData): Promise<OrganizationData> {
    return this.request<OrganizationData>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  async findOrganizationByName(name: string): Promise<OrganizationData | null> {
    const response = await this.request<{ data: OrganizationData[] }>(
      `/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`,
    );
    return response.data?.[0] || null;
  }

  async createUser(data: UserData): Promise<UserData> {
    return this.request<UserData>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async findUserByEmail(email: string): Promise<UserData | null> {
    const response = await this.request<UserData[]>(
      `/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
    );
    return response[0] || null;
  }
}
