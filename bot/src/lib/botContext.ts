let _botUsername = '';

export function setBotUsername(username: string): void {
  _botUsername = username;
}

export function getBotUsername(): string {
  if (!_botUsername) {
    throw new Error('Bot username not initialized. Call setBotUsername() after bot.init().');
  }
  return _botUsername;
}
