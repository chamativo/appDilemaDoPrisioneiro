// Gerenciamento Firebase
class FirebaseManager {
    constructor() {
        this.db = null;
        this.connected = false;
        this.config = {
            apiKey: "AIzaSyBBpLIRLhSJbKFaB9EZgSoBzi976Mf44bA",
            authDomain: "appdilemadoprisioneiro.firebaseapp.com",
            databaseURL: "https://appdilemadoprisioneiro-default-rtdb.firebaseio.com",
            projectId: "appdilemadoprisioneiro",
            storageBucket: "appdilemadoprisioneiro.firebasestorage.app",
            messagingSenderId: "35385722959",
            appId: "1:35385722959:web:c9b650c0f7f939ed57823a"
        };
    }

    async connect() {
        try {
            debug.log('🔥 Iniciando Firebase...');
            firebase.initializeApp(this.config);
            this.db = firebase.database();
            this.connected = true;
            debug.log('✅ Firebase conectado');
            return true;
        } catch (error) {
            debug.log(`❌ Erro Firebase: ${error.message}`);
            this.connected = false;
            return false;
        }
    }

    async initializeData() {
        if (!this.connected) return null;
        
        debug.log('📡 Carregando dados do Firebase...');
        const snapshot = await this.db.ref('gameData').once('value');
        
        if (!snapshot.exists()) {
            debug.log('📝 Criando dados iniciais no Firebase...');
            const initialData = {
                scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
                actions: []
            };
            await this.db.ref('gameData').set(initialData);
            return initialData;
        }
        
        return snapshot.val();
    }

    async saveData(gameData) {
        if (!this.connected) {
            // Fallback para localStorage
            localStorage.setItem('prisonersDilemmaData', JSON.stringify(gameData));
            window.dispatchEvent(new CustomEvent('gameDataChanged', { detail: gameData }));
            return;
        }

        try {
            await this.db.ref('gameData').set(gameData);
            debug.log('💾 Dados salvos no Firebase');
        } catch (error) {
            debug.log(`❌ Erro ao salvar: ${error.message}`);
            // Fallback
            localStorage.setItem('prisonersDilemmaData', JSON.stringify(gameData));
        }
    }

    onDataChange(callback) {
        if (!this.connected) return;
        
        this.db.ref('gameData').on('value', (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('prisonersDilemmaData');
        if (saved) {
            const data = JSON.parse(saved);
            if (!data.actions) data.actions = [];
            return data;
        }

        return {
            scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
            actions: []
        };
    }
}