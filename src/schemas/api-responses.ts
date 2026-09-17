import * as z from 'zod';
import type {
  BrandIdentity,
  GetBrandIdentityGenerationResponse,
  GetPostGenerationResponse,
  ListPostsResponse,
  ListSchedulesResponse,
  Organization,
  Post,
  Schedule,
} from '../types/api';

const organizationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
}).passthrough() satisfies z.ZodType<Organization>;

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  content: z.string(),
  htmlUrl: z.string().nullable(),
  markdown: z.string().nullable(),
  rawHtml: z.string().nullable(),
  recommendations: z.string().nullable(),
  contentType: z.string(),
  sourceMetadata: z.unknown().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<Post>;

const postGenerationJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.string(),
  contentType: z.string(),
  lookbackWindow: z.string(),
  repositoryIds: z.array(z.string()),
  brandVoiceId: z.string().nullable(),
  workflowRunId: z.string().nullable(),
  postId: z.string().nullable(),
  error: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
}).passthrough();

const postGenerationEventSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
}).passthrough();

const brandIdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  websiteUrl: z.string(),
  companyName: z.string().nullable(),
  companyDescription: z.string().nullable(),
  toneProfile: z.string().nullable(),
  customTone: z.string().nullable(),
  customInstructions: z.string().nullable(),
  audience: z.string().nullable(),
  language: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<BrandIdentity>;

const brandIdentityGenerationJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  brandIdentityId: z.string(),
  status: z.string(),
  step: z.string().nullable(),
  currentStep: z.number(),
  totalSteps: z.number(),
  workflowRunId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
}).passthrough();

const scheduleCronSchema = z.object({
  frequency: z.string(),
  hour: z.number(),
  minute: z.number(),
  dayOfWeek: z.number().optional(),
  dayOfMonth: z.number().optional(),
  intervalDays: z.number().optional(),
  anchorDate: z.string().optional(),
}).passthrough();

const scheduleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sourceType: z.literal('cron'),
  sourceConfig: z.object({ cron: scheduleCronSchema }).passthrough(),
  targets: z.object({ repositoryIds: z.array(z.string()) }).passthrough(),
  outputType: z.string(),
  outputConfig: z.object({
    publishDestination: z.string().optional(),
    brandVoiceId: z.string().optional(),
    instructions: z.string().optional(),
  }).passthrough().nullable().optional(),
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  lookbackWindow: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<Schedule>;

const deletionSchema = z.object({
  id: z.string(),
  organization: organizationSchema,
}).passthrough();
const disabledAutomationSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();
const cascadingDeletionSchema = deletionSchema.extend({
  disabledSchedules: z.array(disabledAutomationSchema),
  disabledEvents: z.array(disabledAutomationSchema),
});

export const listPostsResponseSchema = z.object({
  organization: organizationSchema,
  posts: z.array(postSchema),
  pagination: z.object({
    limit: z.number(),
    currentPage: z.number(),
    nextPage: z.number().nullable(),
    previousPage: z.number().nullable(),
    totalPages: z.number(),
    totalItems: z.number(),
  }).passthrough(),
}).passthrough() satisfies z.ZodType<ListPostsResponse>;

export const postResponseSchema = z.object({
  organization: organizationSchema,
  post: postSchema.nullable(),
}).passthrough();
export const postMutationResponseSchema = z.object({
  organization: organizationSchema,
  post: postSchema,
}).passthrough();
export const postDeleteResponseSchema = deletionSchema;
export const postGenerationCreatedResponseSchema = z.object({
  organization: organizationSchema,
  job: postGenerationJobSchema,
}).passthrough();
export const postGenerationResponseSchema = z.object({
  job: postGenerationJobSchema,
  events: z.array(postGenerationEventSchema),
}).passthrough() satisfies z.ZodType<GetPostGenerationResponse>;

export const brandIdentityListResponseSchema = z.object({
  organization: organizationSchema,
  brandIdentities: z.array(brandIdentitySchema),
}).passthrough();
export const brandIdentityResponseSchema = z.object({
  organization: organizationSchema,
  brandIdentity: brandIdentitySchema,
}).passthrough();
export const brandIdentityDeleteResponseSchema = cascadingDeletionSchema;
export const brandIdentityGenerationCreatedResponseSchema = z.object({
  organization: organizationSchema,
  job: brandIdentityGenerationJobSchema,
}).passthrough();
export const brandIdentityGenerationResponseSchema = z.object({
  organization: organizationSchema,
  job: brandIdentityGenerationJobSchema,
}).passthrough() satisfies z.ZodType<GetBrandIdentityGenerationResponse>;

const integrationSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  owner: z.string().nullable().optional(),
  repo: z.string().nullable().optional(),
  linearTeamName: z.string().nullable().optional(),
  linearOrganizationName: z.string().nullable().optional(),
}).passthrough();
export const integrationsResponseSchema = z.object({
  github: z.array(integrationSchema),
  linear: z.array(integrationSchema),
  slack: z.array(z.unknown()),
  organization: organizationSchema,
}).passthrough();
export const githubIntegrationResponseSchema = z.object({
  github: integrationSchema,
  organization: organizationSchema,
}).passthrough();
export const integrationDeleteResponseSchema = cascadingDeletionSchema;

export const schedulesResponseSchema = z.object({
  schedules: z.array(scheduleSchema),
  repositoryMap: z.record(z.string(), z.string()),
  organization: organizationSchema,
}).passthrough() satisfies z.ZodType<ListSchedulesResponse>;
export const scheduleResponseSchema = z.object({
  schedule: scheduleSchema,
  organization: organizationSchema,
}).passthrough();
export const scheduleDeleteResponseSchema = deletionSchema;
