const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Inicializa o Firebase Admin usando a variável de ambiente segura configurada no Render
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Fallback para desenvolvimento local (se tiver o ficheiro na máquina)
    serviceAccount = require('./firebase-service-account.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

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

// Função para enviar avisos no Telegram
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

// Função para disparar a notificação push via Firebase para todos os celulares
async function dispararNotificacaoAgradecimento() {
    const message = {
        notification: {
            title: "🙏 Valeu pela força!",
            body: "Muito obrigado a todos que participaram hoje! Almoço garantido 🍔"
        },
        topic: "aomosso_geral"
    };

    try {
        await admin.messaging().send(message);
        console.log("Notificação de agradecimento enviada via Firebase com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar notificação push:", error);
    }
}

// Configura o servidor para ler arquivos soltos na raiz
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// NOVA ROTA POST: O Widget do Android vai chamar este endpoint!
app.post('/api/votar-sim', (req, res) => {
    contSim++;
    enviarAvisoTelegram("🚨 *Alerta do Ao Mosso (via widget)!* \n🎉 Alguém votou pelo widget que **JÁ PODE AO MOSSAR!** 🍔🏃‍♂️");

    // Atualiza todos os navegadores abertos no site em tempo real via Socket.IO
    io.emit('nova-resposta', 'SIM');
    io.emit('atualizar-placar', { sim: contSim, nao: contNao });

    console.log(`Voto via Widget contabilizado! Total SIM: ${contSim}`);
    res.status(200).json({ success: true, total: contSim });
});

// NOVA ROTA POST: Para disparar o agradecimento manualmente se preferir acionar por API/Webhook
app.post('/api/agradecer', async (req, res) => {
    await dispararNotificacaoAgradecimento();
    enviarAvisoTelegram("🙏 *Agradecimento enviado!* \nO alerta de agradecimento foi disparado para todos os aplicativos.");
    res.status(200).json({ success: true, message: "Agradecimento disparado!" });
});

io.on('connection', (socket) => {
  // Envia o placar atual imediatamente para quem acabou de se conectar/atualizar a página
  socket.emit('atualizar-placar', { sim: contSim, nao: contNao });

  socket.on('resposta', (data) => {
    // Atualiza os contadores no servidor baseando-se na resposta
    if (data === 'SIM') {
        contSim++;
        enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n🎉 Alguém votou que **JÁ PODE AO MOSSAR!** 🍔🏃‍♂️");
    } else if (data === 'NAO') {
        contNao++;
        enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n❌ Uma alma corajosa conseguiu acertar os 10% de chance e negou o ao mosso! 🥲");
    } else if (data.startsWith('HORARIO:')) {
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
