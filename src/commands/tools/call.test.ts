import { describe, expect, test } from 'bun:test';
import ToolsCall from './call';

describe('tools call safety', () => {
  test('requires confirmation before destructive calls reach the network', async () => {
    await expect(new ToolsCall([
      'delete_post',
      '--input',
      '{"postId":"post_1"}',
    ]).run()).rejects.toMatchObject({
      message: expect.stringContaining('Re-run with --yes'),
      oclif: { exit: 2 },
    });
  });
});
