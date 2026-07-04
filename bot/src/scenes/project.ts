import { InlineKeyboard } from 'grammy';
import { MyContext, ApiProject } from '../lib/types.js';
import { getCustomerProjects, approveMilestone, SuspendedError } from '../lib/api.js';
import { formatDateTZ, escapeHtml } from '../lib/format.js';
import {
  t,
  formatMoney,
  tProjectStatus,
  tMilestoneStatus,
  type Lang,
} from '../lib/i18n.js';
import { getLang } from '../lib/lang.js';

const STATUS_EMOJI: Record<string, string> = {
  PROPOSAL_SENT: '📋',
  IN_PROGRESS: '🔧',
  REVIEW: '🔍',
  COMPLETED: '✅',
  CANCELLED: '❌',
};

const MILESTONE_STATUS_EMOJI: Record<string, string> = {
  PENDING: '⏳',
  SUBMITTED_FOR_REVIEW: '🔍',
  APPROVED: '✅',
  PAYMENT_RECEIVED: '💰',
};

function formatProject(lang: Lang, project: ApiProject): string {
  const lines: string[] = [];
  lines.push(`<b>${escapeHtml(project.name)}</b>`);
  lines.push(
    `${t(lang, 'labelStatus')}: ${STATUS_EMOJI[project.status] ?? ''} ${tProjectStatus(lang, project.status)}`,
  );

  if (project.deadline) {
    lines.push(`${t(lang, 'labelDeadline')}: ${formatDateTZ(project.deadline)}`);
  }
  lines.push(`${t(lang, 'labelTotalProject')}: <b>${formatMoney(lang, project.totalPrice)}</b>`);

  if (project.description) {
    lines.push('');
    lines.push(`📝 ${escapeHtml(project.description)}`);
  }

  if (project.milestones.length > 0) {
    lines.push('');
    lines.push(`<b>${t(lang, 'labelMilestones')}:</b>`);
    for (const m of project.milestones) {
      const dueStr = m.dueDate ? ` • ${t(lang, 'dueShort', { date: formatDateTZ(m.dueDate) })}` : '';
      lines.push(`  • ${escapeHtml(m.name)} — ${formatMoney(lang, m.amount)}${dueStr}`);
      lines.push(`    ${MILESTONE_STATUS_EMOJI[m.status] ?? ''} ${tMilestoneStatus(lang, m.status)}`);
    }
  }

  if (project.invoices.length > 0) {
    lines.push('');
    lines.push(`<b>${t(lang, 'labelInvoices')}:</b>`);
    for (const inv of project.invoices) {
      const dueStr = inv.dueDate ? ` • ${t(lang, 'dueShort', { date: formatDateTZ(inv.dueDate) })}` : '';
      const paid = inv.status === 'PAID' ? ' ✅' : ` ⏳ ${t(lang, 'invoiceUnpaidShort')}`;
      lines.push(`  • ${inv.invoiceNumber} — ${formatMoney(lang, inv.total)}${dueStr}${paid}`);
    }
  }

  return lines.join('\n');
}

function buildProjectKeyboard(lang: Lang, project: ApiProject): InlineKeyboard {
  const kb = new InlineKeyboard();

  const pendingReview = project.milestones.filter(
    (m) => m.status === 'SUBMITTED_FOR_REVIEW',
  );
  for (const m of pendingReview) {
    // Full milestone name as a label row; tapping it is a no-op
    kb.text(`📋 ${m.name}`, `ms_label:${m.id}`).row();
    // Approve and Request changes on a single row beneath the label
    kb.text(t(lang, 'approveBtn'), `approve_ms:${m.id}`)
      .text(t(lang, 'requestChangesBtn'), `reject_ms:${m.id}`)
      .row();
  }

  kb.text(t(lang, 'refreshBtn'), 'refresh_projects');
  return kb;
}

export async function showProjects(ctx: MyContext): Promise<void> {
  const lang = await getLang(ctx);
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply(t(lang, 'cantIdentify'));
    return;
  }

  let result: { projects: ApiProject[] };
  try {
    result = await getCustomerProjects(ctx.botUsername, telegramUserId);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'projectsLoadError'));
    return;
  }

  const { projects } = result;

  if (projects.length === 0) {
    await ctx.reply(t(lang, 'noProjects'));
    return;
  }

  for (const project of projects) {
    const text = formatProject(lang, project);
    const kb = buildProjectKeyboard(lang, project);
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
    const lang = await getLang(ctx);
    const milestoneId = ctx.match[1];
    try {
      const result = await approveMilestone(ctx.botUsername, milestoneId, true);
      await ctx.reply(
        t(lang, 'milestoneApprovedMsg', { name: escapeHtml(result.milestone.name) }),
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      if (err instanceof SuspendedError) {
        await ctx.reply(t(lang, 'suspended'));
        return;
      }
      await ctx.reply(t(lang, 'milestoneApproveError'));
    }
  });

  bot.callbackQuery(/^reject_ms:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await getLang(ctx);
    const milestoneId = ctx.match[1];
    try {
      const result = await approveMilestone(ctx.botUsername, milestoneId, false);
      await ctx.reply(
        t(lang, 'milestoneRejectedMsg', { name: escapeHtml(result.milestone.name) }),
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      if (err instanceof SuspendedError) {
        await ctx.reply(t(lang, 'suspended'));
        return;
      }
      await ctx.reply(t(lang, 'milestoneFeedbackError'));
    }
  });
}
