import { NOTRA_API_KEY_ENV_VAR } from '../constants/config';
import {
  brandIdentityDeleteResponseSchema,
  brandIdentityGenerationCreatedResponseSchema,
  brandIdentityGenerationResponseSchema,
  brandIdentityListResponseSchema,
  brandIdentityResponseSchema,
  githubIntegrationResponseSchema,
  integrationDeleteResponseSchema,
  integrationsResponseSchema,
  listPostsResponseSchema,
  postDeleteResponseSchema,
  postGenerationCreatedResponseSchema,
  postGenerationResponseSchema,
  postMutationResponseSchema,
  postResponseSchema,
  scheduleDeleteResponseSchema,
  scheduleResponseSchema,
  schedulesResponseSchema,
} from '../schemas/api-responses';
import type {
  BrandIdentity,
  CreateBrandIdentityRequest,
  CreateGitHubIntegrationRequest,
  CreatePostGenerationRequest,
  GetBrandIdentityGenerationResponse,
  GetPostGenerationResponse,
  ListPostsRequest,
  ListPostsResponse,
  ListSchedulesResponse,
  Organization,
  Post,
  Schedule,
  ScheduleBody,
  UpdateBrandIdentityBody,
  UpdatePostBody,
} from '../types/api';
import type { ClientOverrides } from '../types/client';
import { getApiKey, getBaseUrl, getStoredAuth } from './config';
import { HttpClient } from './http-client';
import { apiResponseDecoder } from '../utils/parse-api-response';

export class MissingApiKeyError extends Error {
  constructor() {
    super('Not signed in. Run `notra auth login`, set `NOTRA_API_KEY`, or pass `--api-key`.');
    this.name = 'MissingApiKeyError';
  }
}

export function resolveBearerToken(overrides: ClientOverrides = {}): string | undefined {
  return (
    overrides.apiKey ??
    process.env[NOTRA_API_KEY_ENV_VAR] ??
    getStoredAuth()?.accessToken ??
    getApiKey()
  );
}

export function buildClient(overrides: ClientOverrides = {}): NotraClient {
  const bearer = resolveBearerToken(overrides);
  if (!bearer) throw new MissingApiKeyError();
  return new NotraClient({ apiKey: bearer, baseUrl: overrides.baseUrl ?? getBaseUrl() });
}

export class NotraClient extends HttpClient {
  readonly content = new ContentClient(this);
  readonly schedules = new SchedulesClient(this);

  constructor(options: { apiKey?: string; baseUrl: string }) {
    super({ ...options, userAgent: `notra-cli/${process.env.npm_package_version ?? 'dev'}` });
  }
}

class ContentClient {
  constructor(private readonly http: HttpClient) {}

  listPosts(request: ListPostsRequest = {}): Promise<ListPostsResponse> {
    return this.http.request('GET', '/v1/posts', {
      query: request,
      decode: apiResponseDecoder(listPostsResponseSchema, 'post list'),
    });
  }

  getPost(request: { postId: string }): Promise<{ organization: Organization; post: Post | null }> {
    return this.http.request('GET', `/v1/posts/${segment(request.postId)}`, {
      decode: apiResponseDecoder(postResponseSchema, 'post'),
    });
  }

  deletePost(request: { postId: string }): Promise<{ id: string; organization: Organization }> {
    return this.http.request('DELETE', `/v1/posts/${segment(request.postId)}`, {
      decode: apiResponseDecoder(postDeleteResponseSchema, 'post deletion response'),
    });
  }

  async updatePost(request: { postId: string; body: UpdatePostBody }) {
    const result = await this.http.request(
      'PATCH',
      `/v1/posts/${segment(request.postId)}`,
      {
        body: request.body,
        decode: apiResponseDecoder(postMutationResponseSchema, 'updated post'),
      },
    );
    return { headers: {}, result };
  }

  async createPostGeneration(request: CreatePostGenerationRequest) {
    const result = await this.http.request('POST', '/v1/posts/generate', {
      body: request,
      decode: apiResponseDecoder(postGenerationCreatedResponseSchema, 'post generation job'),
    });
    return { headers: {}, result };
  }

  getPostGeneration(request: { jobId: string }): Promise<GetPostGenerationResponse> {
    return this.http.request('GET', `/v1/posts/generate/${segment(request.jobId)}`, {
      decode: apiResponseDecoder(postGenerationResponseSchema, 'post generation status'),
    });
  }

  listBrandIdentities(): Promise<{
    organization: Organization;
    brandIdentities: BrandIdentity[];
  }> {
    return this.http.request('GET', '/v1/brand-identities', {
      decode: apiResponseDecoder(brandIdentityListResponseSchema, 'brand identity list'),
    });
  }

  async createBrandIdentity(request: CreateBrandIdentityRequest) {
    const result = await this.http.request('POST', '/v1/brand-identities/generate', {
      body: request,
      decode: apiResponseDecoder(
        brandIdentityGenerationCreatedResponseSchema,
        'brand identity generation job',
      ),
    });
    return { headers: {}, result };
  }

  getBrandIdentityGeneration(request: {
    jobId: string;
  }): Promise<GetBrandIdentityGenerationResponse> {
    return this.http.request('GET', `/v1/brand-identities/generate/${segment(request.jobId)}`, {
      decode: apiResponseDecoder(
        brandIdentityGenerationResponseSchema,
        'brand identity generation status',
      ),
    });
  }

  getBrandIdentity(request: {
    brandIdentityId: string;
  }): Promise<{ organization: Organization; brandIdentity: BrandIdentity }> {
    return this.http.request('GET', `/v1/brand-identities/${segment(request.brandIdentityId)}`, {
      decode: apiResponseDecoder(brandIdentityResponseSchema, 'brand identity'),
    });
  }

  deleteBrandIdentity(request: { brandIdentityId: string }): Promise<{
    id: string;
    organization: Organization;
    disabledSchedules: Array<{ id: string; name: string }>;
    disabledEvents: Array<{ id: string; name: string }>;
  }> {
    return this.http.request('DELETE', `/v1/brand-identities/${segment(request.brandIdentityId)}`, {
      decode: apiResponseDecoder(brandIdentityDeleteResponseSchema, 'brand identity deletion response'),
    });
  }

  updateBrandIdentity(request: {
    brandIdentityId: string;
    body: UpdateBrandIdentityBody;
  }): Promise<{ organization: Organization; brandIdentity: BrandIdentity }> {
    return this.http.request('PATCH', `/v1/brand-identities/${segment(request.brandIdentityId)}`, {
      body: request.body,
      decode: apiResponseDecoder(brandIdentityResponseSchema, 'updated brand identity'),
    });
  }

  listIntegrations(): Promise<{
    github: Array<{ id: string; displayName: string; owner?: string | null; repo?: string | null }>;
    linear: Array<{
      id: string;
      displayName: string;
      linearTeamName?: string | null;
      linearOrganizationName?: string | null;
    }>;
    slack: unknown[];
    organization: Organization;
  }> {
    return this.http.request('GET', '/v1/integrations', {
      decode: apiResponseDecoder(integrationsResponseSchema, 'integration list'),
    });
  }

  async createGitHubIntegration(request: CreateGitHubIntegrationRequest) {
    const result = await this.http.request('POST', '/v1/integrations/github', {
      body: request,
      decode: apiResponseDecoder(githubIntegrationResponseSchema, 'GitHub integration'),
    });
    return { headers: {}, result };
  }

  deleteIntegration(request: { integrationId: string }): Promise<{
    id: string;
    organization: Organization;
    disabledSchedules: Array<{ id: string; name: string }>;
    disabledEvents: Array<{ id: string; name: string }>;
  }> {
    return this.http.request('DELETE', `/v1/integrations/${segment(request.integrationId)}`, {
      decode: apiResponseDecoder(integrationDeleteResponseSchema, 'integration deletion response'),
    });
  }
}

class SchedulesClient {
  constructor(private readonly http: HttpClient) {}

  listSchedules(request?: { repositoryIds?: string }): Promise<ListSchedulesResponse> {
    return this.http.request('GET', '/v1/schedules', {
      query: request,
      decode: apiResponseDecoder(schedulesResponseSchema, 'schedule list'),
    });
  }

  createSchedule(body: ScheduleBody): Promise<{ schedule: Schedule; organization: Organization }> {
    return this.http.request('POST', '/v1/schedules', {
      body,
      decode: apiResponseDecoder(scheduleResponseSchema, 'schedule'),
    });
  }

  deleteSchedule(request: { scheduleId: string }): Promise<{ id: string; organization: Organization }> {
    return this.http.request('DELETE', `/v1/schedules/${segment(request.scheduleId)}`, {
      decode: apiResponseDecoder(scheduleDeleteResponseSchema, 'schedule deletion response'),
    });
  }

  updateSchedule(request: {
    scheduleId: string;
    body: ScheduleBody;
  }): Promise<{ schedule: Schedule; organization: Organization }> {
    return this.http.request('PATCH', `/v1/schedules/${segment(request.scheduleId)}`, {
      body: request.body,
      decode: apiResponseDecoder(scheduleResponseSchema, 'updated schedule'),
    });
  }
}

function segment(value: string): string {
  return encodeURIComponent(value);
}
