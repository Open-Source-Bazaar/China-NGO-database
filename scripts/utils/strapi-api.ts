import { HTTPClient } from 'koajax';
import { NewData } from 'mobx-restful';
import { StrapiListModel, UserModel } from 'mobx-strapi';

import { TargetOrganization, TargetUser } from '../types';

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

export class TargetOrganizationModel extends StrapiListModel<TargetOrganization> {
  baseURI = 'organizations';
  client = strapiClient;
}

export class TargetUserModel extends UserModel<TargetUser> {
  baseURI = 'users';
  client = strapiClient;

  override async updateOne(data: Partial<NewData<TargetUser>>, id?: number) {
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
