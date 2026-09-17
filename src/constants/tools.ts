import { OPENAPI_OPERATIONS } from './openapi';
import type { ToolDefinition, ToolSafety } from '../types/tools';

const MCP_TOOL_OPERATIONS: Readonly<Record<string, string | undefined>> = {
  approve_geo_content_brief: 'approveGeoContentBrief',
  create_chat: 'createChat',
  create_geo_prompt: 'createGeoPrompt',
  create_geo_scan: 'createGeoScan',
  create_geo_sequence: 'createGeoSequence',
  create_github_integration: 'createGitHubIntegration',
  create_project: 'createProject',
  create_schedule: 'createSchedule',
  create_skill: 'createSkill',
  delete_brand_identity: 'deleteBrandIdentity',
  delete_geo_competitor: 'deleteGeoCompetitor',
  delete_geo_prompt: 'deleteGeoPrompt',
  delete_geo_sequence: 'deleteGeoSequence',
  delete_integration: 'deleteIntegration',
  delete_post: 'deletePost',
  delete_project: 'deleteProject',
  delete_schedule: 'deleteSchedule',
  delete_skill: 'deleteSkill',
  generate_brand_identity: 'createBrandIdentity',
  generate_post: 'createPostGeneration',
  get_brand_identity: 'getBrandIdentity',
  get_brand_identity_generation_status: 'getBrandIdentityGeneration',
  get_chat: 'getChat',
  get_chat_by_external_channel: 'getChatByExternalChannel',
  get_geo_agent_readiness: 'getGeoAgentReadiness',
  get_geo_changes: 'listGeoChanges',
  get_geo_competitor_detail: 'getGeoVisibilityCompetitorDetail',
  get_geo_competitor_share: 'getGeoVisibilityCompetitorShare',
  get_geo_content_brief: 'getGeoContentBrief',
  get_geo_ingest_setup: 'getGeoIngestSetup',
  get_geo_language_share: 'getGeoVisibilityLanguageShare',
  get_geo_prompt_history: 'getGeoPromptHistory',
  get_geo_prompt_result_detail: 'getGeoPromptResultDetail',
  get_geo_prompt_results: 'getGeoVisibilityPromptResults',
  get_geo_scan: 'getGeoScan',
  get_geo_sentiment: 'getGeoSentiment',
  get_geo_sentiment_analysis: 'getGeoSentimentAnalysis',
  get_geo_settings: 'getGeoSettings',
  get_geo_snapshot: undefined,
  get_geo_traffic_journey: 'getGeoTrafficJourney',
  get_geo_traffic_log: 'getGeoTrafficLog',
  get_geo_traffic_overview: 'getGeoTrafficOverview',
  get_geo_visibility_overview: 'getGeoVisibilityOverview',
  get_geo_visibility_timeseries: 'getGeoVisibilityTimeseries',
  get_post: 'getPost',
  get_post_generation_status: 'getPostGeneration',
  get_project: 'getProject',
  get_skill: 'getSkill',
  import_geo_competitors: 'importGeoCompetitors',
  import_geo_prompts: 'importGeoPrompts',
  issue_geo_ingest_token: 'issueGeoIngestToken',
  list_brand_identities: 'listBrandIdentities',
  list_chats: 'listChats',
  list_geo_competitors: 'listGeoCompetitors',
  list_geo_content_briefs: 'listGeoContentBriefs',
  list_geo_content_gaps: 'listGeoContentGaps',
  list_geo_prompt_result_summaries: 'listGeoPromptResultSummaries',
  list_geo_prompts: 'listGeoPrompts',
  list_geo_scans: 'listGeoScans',
  list_geo_sentiment_evidence: 'listGeoSentimentEvidence',
  list_geo_sequences: 'listGeoSequences',
  list_geo_shelf_sources: 'listGeoShelfSources',
  list_geo_traffic_journeys: 'listGeoTrafficJourneys',
  list_geo_traffic_pages: 'listGeoTrafficPages',
  list_integrations: 'listIntegrations',
  list_posts: 'listPosts',
  list_projects: 'listProjects',
  list_schedules: 'listSchedules',
  list_skills: 'listSkills',
  list_workspaces: 'getWorkspaces',
  plan_geo_content_brief: 'planGeoContentBrief',
  post_chat_message: 'postChatMessage',
  rotate_geo_ingest_token: 'rotateGeoIngestToken',
  run_geo_sequence: 'runGeoSequence',
  start_geo_agent_readiness_scan: 'startGeoAgentReadinessScan',
  submit_feedback: 'submitFeedback',
  suggest_geo_competitors: 'suggestGeoCompetitors',
  update_brand_identity: 'updateBrandIdentity',
  update_geo_prompt: 'updateGeoPrompt',
  update_geo_sequence: 'updateGeoSequence',
  update_geo_settings: 'updateGeoSettings',
  update_post: 'updatePost',
  update_project: 'updateProject',
  update_schedule: 'updateSchedule',
  update_skill: 'patchSkill',
  upsert_geo_competitor: 'upsertGeoCompetitor',
  whoami: 'getWorkspaces',
};

const BILLABLE_TOOLS = new Set([
  'create_geo_scan',
  'plan_geo_content_brief',
  'run_geo_sequence',
]);

// Mirrors the MCP server's destructiveHint annotations. These include updates because
// they mutate persisted state, even when the operation is reversible in the product UI.
const DESTRUCTIVE_TOOLS = new Set([
  'delete_brand_identity',
  'delete_geo_competitor',
  'delete_geo_prompt',
  'delete_geo_sequence',
  'delete_integration',
  'delete_post',
  'delete_project',
  'delete_schedule',
  'delete_skill',
  'rotate_geo_ingest_token',
  'update_brand_identity',
  'update_geo_prompt',
  'update_geo_sequence',
  'update_geo_settings',
  'update_post',
  'update_project',
  'update_schedule',
  'update_skill',
]);

const operationsById = new Map<string, (typeof OPENAPI_OPERATIONS)[number]>(
  OPENAPI_OPERATIONS.map((operation) => [operation.id, operation]),
);

export const MCP_TOOLS: ReadonlyArray<ToolDefinition> = Object.entries(MCP_TOOL_OPERATIONS).map(
  ([name, operationId]) => {
    const operation = operationId ? operationsById.get(operationId) : undefined;
    return {
      name,
      operation,
      safety: safetyFor(name, operation?.method),
      unavailableReason: operation
        ? undefined
        : 'This is a composite MCP-only tool. Use the Notra MCP server for the combined snapshot.',
    };
  },
);

export function findMcpTool(name: string): ToolDefinition | undefined {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

function safetyFor(name: string, method: string | undefined): ToolSafety {
  if (BILLABLE_TOOLS.has(name)) return 'billable';
  if (DESTRUCTIVE_TOOLS.has(name)) return 'destructive';
  if (method === 'GET' || name === 'get_geo_snapshot') return 'read';
  return 'write';
}
