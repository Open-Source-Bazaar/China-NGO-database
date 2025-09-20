/**
 * MobX-RESTful compatible Strapi models
 */

import { HTTPClient } from 'koajax';
import {
  ListModel,
  DataObject,
  Filter,
  IDType,
  toggle,
  NewData,
} from 'mobx-restful';
import { buildURLData } from 'web-utility';

import { Organization, UsersPermissionsUser as User } from '../../types';

// Global configuration for all models
let globalConfig: { baseURL: string; token: string } | null = null;

export function configureModels(baseURL: string, token: string) {
  globalConfig = { baseURL, token };
}

// Base table model for Strapi
export abstract class StrapiTableModel<
  D extends DataObject,
  F extends Filter<D> = Filter<D>,
> extends ListModel<D, F> {
  client: HTTPClient;

  constructor() {
    super();

    if (!globalConfig) {
      throw new Error(
        'Models must be configured with configureModels() before use',
      );
    }

    this.client = new HTTPClient({
      baseURI: new URL('api/', globalConfig.baseURL).toString(),
      responseType: 'json',
    });

    // Add authorization header
    this.client.use(({ request }, next) => {
      request.headers = {
        Authorization: `Bearer ${globalConfig!.token}`,
        ...request.headers,
        'Strapi-Response-Format': 'v4',
      };
      return next();
    });
  }

  @toggle('uploading')
  async updateOne(data: Partial<NewData<D>>, id?: IDType) {
    const { body } = await (id
      ? this.client.put<{ data: D }>(`${this.baseURI}/${id}`, { data })
      : this.client.post<{ data: D }>(this.baseURI, { data }));

    return (this.currentOne = body!.data);
  }

  async loadPage(pageIndex: number = 1, pageSize: number = 10, filter: F) {
    const queryParams = {
      'pagination[page]': pageIndex,
      'pagination[pageSize]': pageSize,
      ...this.buildFilterParams(filter),
    };

    const { body } = await this.client.get<{
      data: D[];
      meta: { pagination: { total: number } };
    }>(`${this.baseURI}?${buildURLData(queryParams)}`);

    return {
      pageData: body!.data,
      totalCount: body!.meta.pagination.total,
    };
  }

  async getOne(id: IDType) {
    const { body } = await this.client.get<{ data: D }>(
      `${this.baseURI}/${id}`,
    );
    return body!.data;
  }

  // Helper method to build filter parameters for Strapi
  private buildFilterParams(filter: F): Record<string, any> {
    const params: Record<string, any> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (value != null) {
        params[`filters[${key}][$eq]`] = value;
      }
    }

    return params;
  }
}

// Organization model
export class OrganizationModel extends StrapiTableModel<Organization> {
  baseURI = 'organizations';
}

// User model
export class UserModel extends StrapiTableModel<User> {
  baseURI = 'users';

  // Override to handle user-specific creation logic
  @toggle('uploading')
  async updateOne(data: Partial<NewData<User>>, id?: IDType) {
    // For user creation, we may need to set default role, password etc.
    const userData = {
      ...data,
      // Set default role if not provided
      role: data.role || 1, // Default authenticated user role
      // Generate random password if creating new user and no password provided
      password:
        data.password || (id ? undefined : this.generateRandomPassword()),
      // Set confirmed to true by default
      confirmed: data.confirmed !== undefined ? data.confirmed : true,
    };

    const { body } = await (id
      ? this.client.put<{ data: User }>(`${this.baseURI}/${id}`, userData)
      : this.client.post<{ data: User }>(this.baseURI, userData));

    return (this.currentOne = body!.data);
  }

  private generateRandomPassword(): string {
    return Math.random().toString(36).slice(-12);
  }
}
