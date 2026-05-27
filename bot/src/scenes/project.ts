import { InlineKeyboard } from 'grammy';
import { MyContext, ApiProject } from '../lib/types.js';
import { getCustomerProjects, approveMilestone } from '../lib/api.js';
import { getBotUsername } from '../lib/botContext.js';
import { formatUZS, formatDateTZ } from '../lib/format.js';

const STATUS_LABEL: Record<string, string> = {
  PROPOSAL_SENT: '📋 Proposal sent',
  IN_PROGRESS: '🔧 In progress',
  REVIEW: '🔍 In review',
  COMPLETED: '✅ Completed',
  CANCELLED: '❌ Cancelled',
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PENDING: '⏳ Pending',
  SUBMITTED_FOR_REVIEW: '🔍 Awaiting your review',
  APPROVED: '✅ Approved',
  PAYMENT_RECEIVED: '💰 Payment received',
};

function formatProject(project: ApiProject): string {
  const lines: string[] = [];
  lines.push(`<b>${project.name}</b>`);
  lines.push(`Status: ${STATUS_LABEL[project.status] ?? project.status}`);

  if (project.deadline) {
    lines.push(`Deadline: ${formatDateTZ(project.deadline)}`);
  }
  lines.push(`Total: <b>${formatUZS(project.totalPrice)}</b>`);

  if (project.description) {
    lines.push('');
    lines.push(`📝 ${project.description}`);
  }

  if (project.milestones.length > 0) {
    lines.push('');
    lines.push('<b>Milestones:</b>');
    for (const m of project.milestones) {
      const dueStr = m.dueDate ? ` • Due ${formatDateTZ(m.dueDate)}` : '';
      lines.push(`  • ${m.name} — ${formatUZS(m.amount)}${dueStr}`);
      lines.push(`    ${MILESTONE_STATUS_LABEL[m.status] ?? m.status}`);
    }
  }

  if (project.invoices.length > 0) {
    lines.push('');
    lines.push('<b>Invoices:</b>');
    for (const inv of project.invoices) {
      const dueStr = inv.dueDate ? ` • Due ${formatDateTZ(inv.dueDate)}` : '';
      const paid = inv.status === 'PAID' ? ' ✅' : ' ⏳ Unpaid';
      lines.push(`  • ${inv.invoiceNumber} — ${formatUZS(inv.total)}${dueStr}${paid}`);
    }
  }

  return lines.join('\n');
}

function buildProjectKeyboard(project: ApiProject): InlineKeyboard {
  const kb = new InlineKeyboard();

  const pendingReview = project.milestones.filter(
    (m) => m.status === 'SUBMITTED_FOR_REVIEW',
  );
  for (const m of pendingReview) {
    // Full milestone name as a label row; tapping it is a no-op
    kb.text(`📋 ${m.name}`, `ms_label:${m.id}`).row();
    // Approve and Request changes on a single row beneath the label
    kb.text('✅ Approve', `approve_ms:${m.id}`)
      .text('🔄 Request changes', `reject_ms:${m.id}`)
      .row();
  }

  kb.text('🔄 Refresh', 'refresh_projects');
  return kb;
}

export async function showProjects(ctx: MyContext): Promise<void> {
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply('Could not identify you.');
    return;
  }

  let result: { projects: ApiProject[] };
  try {
    result = await getCustomerProjects(getBotUsername(), telegramUserId);
  } catch {
    await ctx.reply('Could not load projects. Please try again later.');
    return;
  }

  const { projects } = result;

  if (projects.length === 0) {
    await ctx.reply('You have no active projects.');
    return;
  }

  for (const project of projects) {
    const text = formatProject(project);
    const kb = buildProjectKeyboard(project);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

export function registerProjectHandlers(bot: import('grammy').Bot<MyContext>): void {
  bot.callbackQuery('show_projects', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showProjects(ctx);
  });

  bot.callbackQuery('refresh_projects', async (ctx) => {
    await ctx.answerCallbackQuery('Refreshing...');
    await showProjects(ctx);
  });

  bot.callbackQuery(/^ms_label:/, async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^approve_ms:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const milestoneId = ctx.match[1];
    try {
      const result = await approveMilestone(getBotUsername(), milestoneId, true);
      await ctx.reply(
        `✅ You have approved <b>${result.milestone.name}</b>. The owner has been notified.`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('Could not approve milestone. Please try again.');
    }
  });

  bot.callbackQuery(/^reject_ms:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const milestoneId = ctx.match[1];
    try {
      const result = await approveMilestone(getBotUsername(), milestoneId, false);
      await ctx.reply(
        `🔄 Changes requested for <b>${result.milestone.name}</b>. The owner has been notified.`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('Could not send feedback. Please try again.');
    }
  });
}
