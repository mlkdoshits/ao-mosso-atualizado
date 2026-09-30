const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const admin = require('firebase-admin');

// Inicializa o Firebase Admin usando a variável de ambiente segura configurada no Render
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Fallback para desenvolvimento local (se tiver o ficheiro na máquina)
        serviceAccount = require('./firebase-service-account.json');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('Erro ao inicializar o Firebase Admin:', error);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IMPORTANTE: Necessário para o servidor ler o JSON enviado pelo Widget do Android
app.use(express.json());

// Configurações do Telegram
const TELEGRAM_BOT_TOKEN = '8718522847:AAGV1HaW3wf2R11vYP-I3zm9unAg3J0y-7Y';
const TELEGRAM_CHAT_ID = '8524528778';

// Contadores globais salvos no servidor
let contSim = 0;
let contNao = 0;

// Função para enviar avisos no Telegram (usando o fetch nativo do Node.js)
async function enviarAvisoTelegram(texto) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: texto,
                parse_mode: 'Markdown'
            })
        });
    } catch (erro) {
        console.error('Erro ao enviar mensagem para o Telegram:', erro);
    }
}

// Função modificada para aceitar título e mensagem personalizados
async function dispararNotificacaoAgradecimento(tituloCustom, corpoCustom) {
    try {
        const titulo = tituloCustom || "Valeu pelo ao mosso, grande Arthur Navey! 🙏";
        const corpo = corpoCustom || "Acabei de ver que vc liberou o ao mosso dus guri. 🍽️";

        const message = {
            notification: {
                title: titulo,
                body: corpo
            },
            topic: "aomosso_geral"
        };

        await admin.messaging().send(message);
        console.log("Notificação de agradecimento enviada via Firebase com sucesso!");
        return { titulo, corpo };
    } catch (error) {
        console.error("Erro ao enviar notificação push:", error);
        throw error;
    }
}

// Configura o servidor para ler arquivos estáticos na raiz
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Rota POST: O Widget do Android chama este endpoint
app.post('/api/votar-sim', (req, res) => {
    try {
        contSim++;
        enviarAvisoTelegram("🚨 *Alerta do Ao Mosso (via widget)!* \n🎉 Alguém votou pelo widget que **JÁ PODE AO MOSSAR!** 🍔🏃‍♂️");

        // Atualiza todos os navegadores abertos no site em tempo real via Socket.IO
        io.emit('nova-resposta', 'SIM');
        io.emit('atualizar-placar', { sim: contSim, nao: contNao });

        console.log(`Voto via Widget contabilizado! Total SIM: ${contSim}`);
        return res.status(200).json({ success: true, total: contSim });
    } catch (error) {
        console.error("Erro ao processar voto do widget:", error);
        return res.status(500).json({ success: false, error: "Erro interno no servidor" });
    }
});

// Rota GET personalizada: Permite mudar o título e a mensagem diretamente pelos parâmetros da URL
// Exemplo de uso no navegador: https://ja-pode-ao-mossar.onrender.com/api/agradecer?title=MeuTitulo&body=MinhaMensagem
app.get('/api/agradecer', async (req, res) => {
    try {
        const tituloParam = req.query.title;
        const corpoParam = req.query.body;

        const resultado = await dispararNotificacaoAgradecimento(tituloParam, corpoParam);
        enviarAvisoTelegram(`🙏 *Agradecimento enviado!* \nTítulo: _${resultado.titulo}_\nMensagem: _${resultado.corpo}_`);
        
        return res.status(200).json({ 
            success: true, 
            message: "Agradecimento disparado com sucesso!",
            enviado: { title: resultado.titulo, body: resultado.corpo }
        });
    } catch (error) {
        console.error("Erro na rota de agradecer:", error);
        return res.status(500).json({ success: false, error: "Erro ao disparar agradecimento" });
    }
});

// Gerenciamento de conexões via Socket.IO
io.on('connection', (socket) => {
    // Envia o placar atual imediatamente para quem acabou de se conectar/atualizar a página
    socket.emit('atualizar-placar', { sim: contSim, nao: contNao });

    socket.on('resposta', (data) => {
        if (!data) return;

        if (data === 'SIM') {
            contSim++;
            enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n🎉 Alguém votou que **JÁ PODE AO MOSSAR!** 🍔🏃‍♂️");
        } else if (data === 'NAO') {
            contNao++;
            enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n❌ Uma alma corajosa conseguiu acertar os 10% de chance e negou o ao mosso! 🥲");
        } else if (typeof data === 'string' && data.startsWith('HORARIO:')) {
            const hora = data.replace('HORARIO:', '');
            enviarAvisoTelegram(`⏰ *Sugestão de Horário:* Marcaram o compromisso oficial do ao mosso para às *${hora}*! ✨`);
        }

        // Transmite a nova resposta e o placar atualizado para TODOS os dispositivos conectados
        io.emit('nova-resposta', data);
        io.emit('atualizar-placar', { sim: contSim, nao: contNao });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
