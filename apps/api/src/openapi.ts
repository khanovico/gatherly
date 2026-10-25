import fastifySwagger from '@fastify/swagger';
import apiReference from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod';
import { SESSION_COOKIE } from './lib/auth';

const API_PREFIX = '/api/v1/';
const HEALTH_PATHS = new Set(['healthz', 'readyz', 'version']);

/**
 * OpenAPI document generated from the same Zod schemas that validate requests,
 * served at /api/openapi.json with an interactive reference at /api/docs.
 * Must be registered before the API routes so it sees every route.
 */
export async function registerOpenApi(app: FastifyInstance) {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Gatherly API',
        version: 'v1',
        description:
          'Community events: discovery, registration with capacity limits, organizer and admin tools. ' +
          'Errors use application/problem+json with a stable `code`.',
      },
      components: {
        securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE } },
      },
    },
    // Only the versioned API is documented (not static web files), grouped by first path segment.
    transform: (input) => {
      if (!input.url.startsWith(API_PREFIX)) return { schema: { hide: true }, url: input.url };
      const { schema, url } = jsonSchemaTransform(input);
      const [tag = 'api'] = input.url.slice(API_PREFIX.length).split('/');
      return { schema: { ...schema, tags: [HEALTH_PATHS.has(tag) ? 'health' : tag] }, url };
    },
    transformObject: jsonSchemaTransformObject,
  });

  app.get('/api/openapi.json', { schema: { hide: true } }, () => app.swagger());
  await app.register(apiReference, {
    routePrefix: '/api/docs',
    configuration: {
      url: '/api/openapi.json',
      title: 'Gatherly API',
      // A plain reference for reviewers: no hosted-product toolbar, SDK or AI upsells.
      showDeveloperTools: 'never',
      mcp: { disabled: true },
      agent: { disabled: true },
    },
  });
}
