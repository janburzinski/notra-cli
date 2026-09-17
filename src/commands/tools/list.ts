import { Flags } from '@oclif/core';
import { NotraCommand } from '../../base-command';
import { MCP_TOOLS } from '../../constants/tools';
import { renderTable } from '../../utils/output';

type Tool = (typeof MCP_TOOLS)[number];

export default class ToolsList extends NotraCommand {
  static override description = 'List CLI calls that mirror Notra MCP tool names.';
  static override examples = [
    '<%= config.bin %> tools list',
    '<%= config.bin %> tools list --search posts --json',
  ];

  static override flags = {
    search: Flags.string({ description: 'Search tool names, categories, and summaries.' }),
  };

  protected override requiresFreshAccessToken = false;

  public async run(): Promise<void> {
    const { flags } = await this.parse(ToolsList);
    const needle = flags.search?.toLowerCase();
    const tools = MCP_TOOLS.filter((tool) => !needle || [
      tool.name,
      tool.operation?.tag,
      tool.operation?.summary,
    ].join(' ').toLowerCase().includes(needle));

    if (this.emitJson()) {
      this.printJson(tools.map((tool) => ({
        name: tool.name,
        safety: tool.safety,
        available: Boolean(tool.operation),
        summary: tool.operation?.summary ?? tool.unavailableReason,
      })));
      return;
    }

    this.log(renderTable<Tool>(tools, {
      columns: [
        { header: 'Tool', get: (tool) => tool.name },
        { header: 'Safety', get: (tool) => tool.safety },
        { header: 'Summary', get: (tool) => tool.operation?.summary ?? 'MCP only' },
      ],
      empty: 'No matching tools.',
    }));
  }
}
