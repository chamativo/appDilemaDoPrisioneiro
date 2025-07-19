// Módulo Firebase - Apenas conexão e manipulação de dados
class FirebaseModule {
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
            firebase.initializeApp(this.config);
            this.db = firebase.database();
            this.connected = true;
            console.log('✅ Firebase conectado');
            return true;
        } catch (error) {
            console.error('❌ Erro Firebase:', error);
            throw error;
        }
    }

    async loadData() {
        if (!this.connected) throw new Error('Firebase não conectado');
        
        const snapshot = await this.db.ref('gameData').once('value');
        
        if (!snapshot.exists()) {
            const initialData = {
                scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
                actions: []
            };
            await this.saveData(initialData);
            return initialData;
        }
        
        const data = snapshot.val();
        if (!data.actions) data.actions = [];
        return data;
    }

    async saveData(gameData) {
        if (!this.connected) throw new Error('Firebase não conectado');
        await this.db.ref('gameData').set(gameData);
    }

    onDataChange(callback) {
        if (!this.connected) return;
        
        this.db.ref('gameData').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (!data.actions) data.actions = [];
                callback(data);
            }
        });
    }

    async addAction(action) {
        const data = await this.loadData();
        action.timestamp = Date.now();
        data.actions.push(action);
        await this.saveData(data);
    }

    async reset() {
        const cleanData = {
            scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
            actions: []
        };
        await this.saveData(cleanData);
        return cleanData;
    }
}