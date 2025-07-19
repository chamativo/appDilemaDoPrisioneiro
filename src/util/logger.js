// Logger para depuração - substitui console.log conforme especificação
class Logger {
  constructor() {
    this.enabled = true;
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.levels.INFO;
  }

  // Configura nível de log
  setLevel(level) {
    this.currentLevel = this.levels[level] || this.levels.INFO;
  }

  // Habilita/desabilita logs
  enable(enabled = true) {
    this.enabled = enabled;
  }

  // Log de erro
  error(...args) {
    if (this.enabled && this.currentLevel >= this.levels.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  // Log de aviso
  warn(...args) {
    if (this.enabled && this.currentLevel >= this.levels.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  // Log de informação
  info(...args) {
    if (this.enabled && this.currentLevel >= this.levels.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  // Log de debug
  debug(...args) {
    if (this.enabled && this.currentLevel >= this.levels.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  // Log de eventos do EventBus
  event(eventName, data) {
    this.debug(`Event: ${eventName}`, data);
  }

  // Log de mudanças de estado
  state(component, state) {
    this.debug(`State change: ${component}`, state);
  }
}

export default new Logger();