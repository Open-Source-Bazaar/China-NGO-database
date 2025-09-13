import { HTTPClient } from 'koajax';

import { OrganizationData, ExtendedUserData } from '../types';

// 定义更精确的 API 响应类型
interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface StrapiListResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export class StrapiAPI {
  constructor(
    private baseURL: string,
    private token: string,
  ) {
    this.client.baseURI = this.baseURL;
  }

  client = new HTTPClient({ responseType: 'json' }).use(({ request }, next) => {
    request.headers = {
      Authorization: `Bearer ${this.token}`,
      ...request.headers,
    };
    return next();
  });

  async createOrganization(data: OrganizationData): Promise<OrganizationData> {
    const { body } = await this.client.post<StrapiResponse<OrganizationData>>(
      '/api/organizations',
      { data },
    );
    return body.data;
  }

  async findOrganizationByName(
    name: string,
  ): Promise<OrganizationData | undefined> {
    const { body } = await this.client.get<
      StrapiListResponse<OrganizationData>
    >(`/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`);
    return body.data?.[0];
  }

  async findUserByEmail(email: string): Promise<ExtendedUserData | undefined> {
    try {
      const { body } = await this.client.get<
        StrapiListResponse<ExtendedUserData>
      >(`/api/users?filters[email][$eq]=${encodeURIComponent(email)}`);
      return body.data?.[0];
    } catch (error) {
      // 如果查询失败，返回undefined表示用户不存在
      return undefined;
    }
  }

  async createUser(userData: ExtendedUserData): Promise<ExtendedUserData> {
    const { body } = await this.client.post<ExtendedUserData>(
      '/api/users',
      userData,
    );
    return body;
  }

  async findOrganizationByCode(
    code: string,
  ): Promise<OrganizationData | undefined> {
    try {
      const { body } = await this.client.get<
        StrapiListResponse<OrganizationData>
      >(`/api/organizations?filters[code][$eq]=${encodeURIComponent(code)}`);
      return body.data?.[0];
    } catch (error) {
      return undefined;
    }
  }

  async updateOrganizationContactUser(
    organizationId: number,
    userId: number,
  ): Promise<any> {
    const { body } = await this.client.put<StrapiResponse<any>>(
      `/api/organizations/${organizationId}`,
      { data: { contactUser: userId } },
    );
    return body.data;
  }
}
