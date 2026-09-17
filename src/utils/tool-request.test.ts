import { describe, expect, test } from 'bun:test';
import { OPENAPI_OPERATIONS } from '../constants/openapi';
import { prepareToolRequest, projectToolResult, selectOutput } from './tool-request';

function operation(id: string) {
  const value = OPENAPI_OPERATIONS.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`Missing fixture operation: ${id}`);
  return value;
}

describe('MCP-style tool requests', () => {
  test('splits path, query, and body fields', () => {
    expect(prepareToolRequest('update_post', operation('updatePost'), {
      postId: 'post_123',
      title: 'New title',
    })).toEqual({
      path: '/v1/posts/post_123',
      query: {},
      headers: {},
      body: { title: 'New title' },
    });
  });

  test('requests SSE for chat tools', () => {
    expect(prepareToolRequest('create_chat', operation('createChat'), {
      message: 'Hello',
    })).toEqual(expect.objectContaining({
      headers: { Accept: 'text/event-stream, application/json' },
      body: { message: 'Hello' },
    }));
  });

  test('preserves a renamed skill while routing currentName to the path', () => {
    expect(prepareToolRequest('update_skill', operation('patchSkill'), {
      currentName: 'old-name',
      name: 'new-name',
    })).toEqual(expect.objectContaining({
      path: '/v1/skills/old-name',
      body: { name: 'new-name' },
    }));
  });

  test('rejects unknown input for bodyless operations', () => {
    expect(() => prepareToolRequest('get_post', operation('getPost'), {
      postId: 'post_123',
      typo: true,
    })).toThrow('Unknown input field(s): typo');
  });

  test('validates query and body input against bundled OpenAPI schemas', () => {
    expect(() => prepareToolRequest('list_posts', operation('listPosts'), {
      limit: 'many',
    })).toThrow('limit must be integer');
    expect(() => prepareToolRequest('update_post', operation('updatePost'), {
      postId: 'post_123',
      status: 'sideways',
    })).toThrow('input.status must be one of: draft, published');
    expect(() => prepareToolRequest('update_post', operation('updatePost'), {
      postId: 'post_123',
      garbage: true,
    })).toThrow('Unknown input field: input.garbage');
    expect(prepareToolRequest('list_schedules', operation('listSchedules'), {
      repositoryIds: ['repo_1', 'repo_2'],
    }).query.repositoryIds).toEqual(['repo_1', 'repo_2']);
  });

  test('projects chat SSE and selects raw-friendly fields', () => {
    const response = projectToolResult(
      'create_chat',
      'data: {"type":"text-delta","delta":"Hello ","messageMetadata":{"chatId":"chat_1"}}\n' +
        'data: {"type":"text-delta","textDelta":"world"}\n' +
        'data: [DONE]\n',
    );
    expect(response).toEqual({ chatId: 'chat_1', text: 'Hello world' });
    expect(selectOutput({ post: { markdown: '# Hello' } }, 'post.markdown')).toBe('# Hello');
  });

  test('uses the chat response header when SSE metadata omits the chat ID', () => {
    expect(projectToolResult(
      'create_chat',
      'data: {"type":"text-delta","delta":"Hello"}\n',
      {},
      'chat_header',
    )).toEqual({ chatId: 'chat_header', text: 'Hello' });
  });

  test('treats null MCP resources as not found', () => {
    expect(() => projectToolResult('get_post', { post: null }, { postId: 'post_404' }))
      .toThrow('Post post_404 not found.');
    expect(() => projectToolResult(
      'get_brand_identity',
      { brandIdentity: null },
      { brandIdentityId: 'brand_404' },
    )).toThrow('Brand identity brand_404 not found.');
  });
});
