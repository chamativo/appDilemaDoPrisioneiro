// Sistema de debug
class DebugConsole {
    constructor() {
        this.console = null;
    }

    createConsole() {
        if (this.console) return this.console;
        
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-console';
        debugDiv.style.cssText = `
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            width: 300px; 
            height: 200px; 
            background: rgba(0,0,0,0.8); 
            color: white; 
            padding: 10px; 
            font-size: 10px; 
            overflow-y: auto; 
            z-index: 1000;
            border-radius: 5px;
        `;
        document.body.appendChild(debugDiv);
        this.console = debugDiv;
        return debugDiv;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[DEBUG] ${timestamp}: ${message}`;
        
        console.log(logMessage);
        
        const debugDiv = this.console || this.createConsole();
        debugDiv.innerHTML += `<div>${timestamp}: ${message}</div>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }
}

// Instância global
const debug = new DebugConsole();