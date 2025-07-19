// Gerenciamento Firebase - Firebase Only
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
        debug.log('🔥 Conectando ao Firebase...');
        
        try {
            firebase.initializeApp(this.config);
            this.db = firebase.database();
            this.connected = true;
            debug.log('✅ Firebase conectado com sucesso');
            return true;
        } catch (error) {
            debug.log(`❌ ERRO CRÍTICO - Firebase falhou: ${error.message}`);
            throw new Error(`Firebase connection failed: ${error.message}`);
        }
    }

    async initializeData() {
        if (!this.connected) {
            throw new Error('Firebase não conectado');
        }
        
        debug.log('📡 Carregando dados do Firebase...');
        const snapshot = await this.db.ref('gameData').once('value');
        
        if (!snapshot.exists()) {
            debug.log('📝 Criando dados iniciais no Firebase...');
            const initialData = {
                scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
                actions: []
            };
            await this.db.ref('gameData').set(initialData);
            debug.log('✅ Dados iniciais criados no Firebase');
            return initialData;
        }
        
        const data = snapshot.val();
        debug.log(`✅ Dados carregados do Firebase: ${data.actions.length} actions`);
        return data;
    }

    async saveData(gameData) {
        if (!this.connected) {
            throw new Error('Firebase não conectado - não é possível salvar');
        }

        try {
            await this.db.ref('gameData').set(gameData);
            debug.log('💾 Dados salvos no Firebase');
        } catch (error) {
            debug.log(`❌ ERRO ao salvar no Firebase: ${error.message}`);
            throw error;
        }
    }

    onDataChange(callback) {
        if (!this.connected) {
            debug.log('⚠️ Firebase não conectado - listener não configurado');
            return;
        }
        
        this.db.ref('gameData').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                debug.log(`🔄 Dados mudaram no Firebase: ${data.actions.length} actions`);
                callback(data);
            }
        });
    }
}