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
      postId: 'post/123',
      title: 'New title',
    })).toEqual({
      path: '/v1/posts/post%2F123',
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
});
