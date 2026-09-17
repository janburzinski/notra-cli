export type QueryValue = string | number | boolean | ReadonlyArray<string | number | boolean>;

export type ApiRequestOptions = {
  query?: Record<string, QueryValue | undefined>;
  body?: unknown;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export type DecodedApiRequestOptions<Output> = ApiRequestOptions & {
  decode: (value: unknown) => Output;
};

export type ApiClientOptions = {
  apiKey?: string;
  baseUrl: string;
  userAgent?: string;
};

export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Organization = { id: string; slug: string; name: string; logo: string | null };

export type Pagination = {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalPages: number;
  totalItems: number;
};

export type Post = {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  htmlUrl: string | null;
  markdown: string | null;
  rawHtml: string | null;
  recommendations: string | null;
  contentType: string;
  sourceMetadata: unknown | null;
  status: 'draft' | 'published' | (string & {});
  createdAt: string;
  updatedAt: string;
};

export type ListPostsRequest = {
  sort?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  status?: string;
  contentType?: string;
  brandIdentityId?: string;
};

export type ListPostsResponse = {
  organization: Organization;
  posts: Post[];
  pagination: Pagination;
};

export type PostGenerationEvent = {
  id: string;
  jobId: string;
  type: string;
  message: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type PostGenerationJob = {
  id: string;
  organizationId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | (string & {});
  contentType: string;
  lookbackWindow: string;
  repositoryIds: string[];
  brandVoiceId: string | null;
  workflowRunId: string | null;
  postId: string | null;
  error: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type GetPostGenerationResponse = {
  job: PostGenerationJob;
  events: PostGenerationEvent[];
};

export type CreatePostGenerationRequest = {
  contentType: string;
  lookbackWindow?: string;
  brandVoiceId?: string;
  brandIdentityId?: string | null;
  repositoryIds?: string[];
  linearIntegrationIds?: string[];
  integrations?: { github?: string[]; linear?: string[] };
  github?: { repositories: Array<{ owner: string; repo: string }> };
  dataPoints?: {
    includePullRequests?: boolean;
    includeCommits?: boolean;
    includeReleases?: boolean;
    includeLinearData?: boolean;
  };
  selectedItems?: Record<string, unknown>;
  timezone?: string;
};

export type UpdatePostBody = {
  title?: string;
  slug?: string | null;
  markdown?: string;
  status?: 'draft' | 'published';
};

export type BrandIdentity = {
  id: string;
  name: string;
  isDefault: boolean;
  websiteUrl: string;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  customInstructions: string | null;
  audience: string | null;
  language: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBrandIdentityRequest = { name?: string; websiteUrl: string };

export type UpdateBrandIdentityBody = {
  name?: string;
  websiteUrl?: string;
  companyName?: string | null;
  companyDescription?: string | null;
  toneProfile?: string | null;
  customTone?: string | null;
  customInstructions?: string | null;
  audience?: string | null;
  language?: string | null;
  isDefault?: true;
};

export type BrandIdentityGenerationJob = {
  id: string;
  organizationId: string;
  brandIdentityId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | (string & {});
  step: string | null;
  currentStep: number;
  totalSteps: number;
  workflowRunId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type GetBrandIdentityGenerationResponse = {
  organization: Organization;
  job: BrandIdentityGenerationJob;
};

export type CreateGitHubIntegrationRequest = {
  owner: string;
  repo: string;
  branch?: string | null;
  token?: string | null;
};

export type ScheduleCron = {
  frequency: string;
  hour: number;
  minute: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  intervalDays?: number;
  anchorDate?: string;
};

export type ScheduleBody = {
  name: string;
  sourceType: 'cron';
  sourceConfig: { cron: ScheduleCron };
  targets: { repositoryIds: string[] };
  outputType: string;
  outputConfig?: { publishDestination?: string; brandVoiceId?: string; instructions?: string };
  enabled: boolean;
  autoPublish?: boolean;
  lookbackWindow?: string;
};

export type Schedule = Omit<ScheduleBody, 'outputConfig'> & {
  id: string;
  organizationId: string;
  autoPublish: boolean;
  createdAt: string;
  updatedAt: string;
  lookbackWindow: string;
  outputConfig?: ScheduleBody['outputConfig'] | null;
};

export type ListSchedulesResponse = {
  schedules: Schedule[];
  repositoryMap: Record<string, string>;
  organization: Organization;
};

export type OpenApiOperation = {
  id: string;
  method: ApiHttpMethod;
  path: string;
  summary: string;
  tag: string;
  parameters: ReadonlyArray<{
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
  }>;
  hasBody: boolean;
};
