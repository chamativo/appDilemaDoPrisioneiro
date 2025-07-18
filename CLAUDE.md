# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Prisoner's Dilemma Tournament** web application built for family play, implemented as a vanilla JavaScript single-page application with Firebase backend (currently using localStorage for local development).

## Development Commands

Since this is a static web application with no build process:
- **Run locally**: Open `index.html` in a web browser or use a simple HTTP server like `python -m http.server` or `npx serve`
- **No build/test commands**: This is a vanilla HTML/CSS/JS project without package.json or build tools

## Architecture

### Core Application Structure
- **Entry point**: `index.html` - Contains all UI screens and Firebase script tags
- **Game logic**: `script.js` - Single `PrisonersDilemmaGame` class managing all functionality  
- **Styling**: `style.css` - Responsive mobile-first design with CSS Grid

### Key Architectural Patterns

**Screen-based Navigation**: The app uses a single-page architecture with different screens (player-selection, games-screen, game-screen) shown/hidden via CSS classes.

**Event-driven State Management**: Uses multiple synchronization mechanisms:
- localStorage for persistence
- Custom events (`gameDataChanged`) for same-tab updates  
- storage events for cross-tab synchronization
- Polling as backup (every 300ms)

**Action-based Game State**: All game actions are stored as timestamped events in `gameData.actions[]` array, allowing state reconstruction and handling concurrent players.

### Data Model

**Game State Structure**:
```javascript
gameData = {
  scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
  actions: [
    { type: 'choice', player: 'Arthur', choice: 'cooperate', round: 1, gameKey: 'Arthur-Laura', timestamp: ... },
    { type: 'roundResult', gameKey: 'Arthur-Laura', round: 1, result: {...}, timestamp: ... },
    { type: 'gameComplete', gameKey: 'Arthur-Laura', scores: {...}, timestamp: ... }
  ]
}
```

**Game Keys**: Players are sorted alphabetically to create consistent game identifiers (`Arthur-Laura`, not `Laura-Arthur`).

### Multi-player Coordination

The app handles multiple players potentially playing simultaneously by:
- Storing each player action with timestamps
- Reconstructing game state from chronological actions
- Using game keys to isolate different player pairings
- Processing rounds only when both players have made choices

### Firebase Integration

Currently disabled for local development. Firebase config exists but is commented out in `initFirebase()` method. When enabled, it would sync `gameData` across all instances in real-time.

### Debug Features

Both screens include debug buttons that copy current state to clipboard for troubleshooting multiplayer synchronization issues.