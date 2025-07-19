// UI Router - navegação entre telas
class UIRouter {
  constructor() {
    this.currentScreen = null;
    this.screens = new Map();
  }

  // Registra uma tela
  registerScreen(name, screenInstance) {
    this.screens.set(name, screenInstance);
  }

  // Navega para uma tela
  navigateTo(screenName, data = {}) {
    // Esconde tela atual
    if (this.currentScreen) {
      this.currentScreen.hide();
    }

    // Mostra nova tela
    const screen = this.screens.get(screenName);
    if (screen) {
      screen.show(data);
      this.currentScreen = screen;
    } else {
      console.error(`Screen not found: ${screenName}`);
    }
  }

  // Obtém tela atual
  getCurrentScreen() {
    return this.currentScreen;
  }
}

export default new UIRouter();