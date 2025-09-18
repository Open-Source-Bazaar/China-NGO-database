import { Context, HTTPClient } from 'koajax';
import { Base, StrapiListModel } from 'mobx-strapi';

import { Organization, UsersPermissionsUser as User } from '../../types';

export { Organization, User };

export class UserModel extends StrapiListModel<User & Base> {
  baseURI = 'users';

  constructor(public client: HTTPClient<Context>) {
    super();
  }
}

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
    this.client.baseURI = this.baseURL;
  }

  client = new HTTPClient({ responseType: 'json' }).use(({ request }, next) => {
    request.headers = {
      Authorization: `Bearer ${this.token}`,
      ...request.headers,
      'Strapi-Response-Format': 'v4',
    };
    return next();
  });

  userStore = new UserModel(this.client);
  organizationStore = new OrganizationModel(this.client);
}
