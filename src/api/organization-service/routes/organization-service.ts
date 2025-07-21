/**
 * organization-service router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::organization-service.organization-service',
  {
    config: {
      find: {
        auth: false,
        policies: [],
        middlewares: [],
      },
      findOne: {
        auth: false,
        policies: [],
        middlewares: [],
      },
      create: {
        auth: false,
        policies: [],
        middlewares: [],
      },
      update: {
        auth: false,
        policies: [],
        middlewares: [],
      },
      delete: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  },
);
