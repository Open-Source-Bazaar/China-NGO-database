import { HTTPClient } from 'koajax';
import { StrapiListModel, UserModel } from 'mobx-strapi';

import type { ApiOrganizationOrganization, PluginUsersPermissionsUser as User } from '../../types/generated/contentTypes';

const { STRAPI_API_URL, STRAPI_TOKEN } = process.env;

export const strapiClient = new HTTPClient({
  baseURI: new URL('api/', STRAPI_API_URL) + '',
  responseType: 'json',
}).use(({ request }, next) => {
  request.headers = {
    Authorization: `Bearer ${STRAPI_TOKEN}`,
    ...request.headers,
    'Strapi-Response-Format': 'v4',
  };
  return next();
});

// Organization model
export class TargetOrganizationModel extends StrapiListModel<ApiOrganizationOrganization> {
  baseURI = 'organizations';
  client = strapiClient;
}

// User model
export class TargetUserModel extends UserModel {
  baseURI = 'users';
  client = strapiClient;

  override async updateOne(data: Partial<User>, id?: number) {
    const userData = {
      ...data,
      role: data.role || 1,
      password:
        data.password || (id ? undefined : this.generateRandomPassword()),
      confirmed: data.confirmed ?? true,
    };
    return super.updateOne(userData, id);
  }

  private generateRandomPassword = () => Math.random().toString(36).slice(-12);
}

// Legacy exports for backward compatibility
export { ApiOrganizationOrganization as Organization, User };

// Legacy API class for gradual migration
export class StrapiAPI {
  constructor(
    private baseURL: string,
    private token: string,
  ) {
    // Set environment variables for the new models
    process.env.STRAPI_API_URL = this.baseURL;
    process.env.STRAPI_TOKEN = this.token;
  }

  get client() {
    return strapiClient;
  }

  userStore = new TargetUserModel();
  organizationStore = new TargetOrganizationModel();
}
