import { Context, HTTPClient } from 'koajax';
import { Base, StrapiListModel, UserModel } from 'mobx-strapi';

import { Organization, UsersPermissionsUser as User } from '../../types';

export { Organization, User };

export class OrganizationModel extends StrapiListModel<Organization & Base> {
  baseURI = 'organizations';

  constructor(public client: HTTPClient<Context>) {
    super();
  }
}

export class StrapiAPI {
  constructor(
    private baseURL: string,
    private token: string,
  ) {
    this.client.baseURI = new URL('api/', this.baseURL) + '';
    this.userStore.client = this.client;
  }

  client = new HTTPClient({ responseType: 'json' }).use(({ request }, next) => {
    request.headers = {
      Authorization: `Bearer ${this.token}`,
      ...request.headers,
      'Strapi-Response-Format': 'v4',
    };
    return next();
  });

  userStore = new UserModel();
  organizationStore = new OrganizationModel(this.client);
}
