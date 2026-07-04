// Escape text for Telegram HTML parse_mode (only & < > matter). Every
// owner- or customer-provided value interpolated into a message sent with
// parse_mode 'HTML' (see lib/telegram.ts) MUST pass through this first: without
// it a value containing '<' or '&' either injects markup (e.g. a phishing
// <a href> link) into the recipient's chat or makes Telegram reject the send
// (400 "can't parse entities"), silently dropping the notification.
//
// This is an exact replica of the bot's escapeHtml (bot/src/lib/format.ts) —
// the two services do not share a package, so the identical logic is duplicated
// rather than a second, divergent variant being introduced. Keep them in sync.
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
