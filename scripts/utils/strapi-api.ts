import { HTTPClient } from 'koajax';

import { OrganizationData } from '../types';

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

  async createOrganization(data: OrganizationData) {
    const { body } = await this.client.post<OrganizationData>(
      '/api/organizations',
      { data },
    );
    return body;
  }

  async findOrganizationByName(name: string) {
    const { body } = await this.client.get<{ data: OrganizationData[] }>(
      `/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`,
    );
    return body.data?.[0];
  }
}
