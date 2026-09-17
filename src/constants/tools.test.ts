import { describe, expect, test } from 'bun:test';
import { findMcpTool } from './tools';

describe('MCP tool safety metadata', () => {
  test('mirrors destructive mutation annotations', () => {
    for (const name of ['delete_post', 'update_post', 'update_schedule', 'rotate_geo_ingest_token']) {
      expect(findMcpTool(name)?.safety).toBe('destructive');
    }
  });
});
