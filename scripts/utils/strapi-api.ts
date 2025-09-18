import { Context, HTTPClient } from 'koajax';
import { IDType, NewData, toggle } from 'mobx-restful';
import { Base, StrapiListModel } from 'mobx-strapi';

import { Organization, UsersPermissionsUser as User } from '../../types';

export { Organization, User };

export class UserModel extends StrapiListModel<User & Base> {
  baseURI = 'users';

  constructor(public client: HTTPClient<Context>) {
    super();
  }

  @toggle('uploading')
  async updateOne(data: Partial<NewData<User & Base>>, id?: IDType) {
    const { body } = await (id
      ? this.client.put<User & Base>(`${this.baseURI}/${id}`, data)
      : this.client.post<User & Base>(this.baseURI, data));

    return (this.currentOne = body!);
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
    this.client.baseURI = new URL('api/', this.baseURL) + '';
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
