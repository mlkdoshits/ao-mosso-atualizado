const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configurações do Telegram
const TELEGRAM_BOT_TOKEN = '8718522847:AAGV1HaW3wf2R11vYP-I3zm9unAg3J0y-7Y';
const TELEGRAM_CHAT_ID = '8524528778';

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

// Configura o servidor para ler arquivos soltos na raiz (sem pastas)
app.use(express.static(__dirname));

// Abre a votação no link principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Abre o painel de resultados no link /dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

io.on('connection', (socket) => {
  socket.on('resposta', (data) => {
    // Repassa para os painéis conectados (WebSocket)
    io.emit('nova-resposta', data);

    // Dispara o aviso correspondente no Telegram
    if (data === 'SIM') {
        enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n🎉 Alguém votou que **JÁ PODE AO MOSSAR!** 🍔🏃‍♂️");
    } else if (data === 'NAO') {
        enviarAvisoTelegram("🚨 *Alerta do Ao Mosso!* \n❌ Uma alma corajosa conseguiu acertar os 10% de chance e negou o ao mosso! 🥲");
    } else if (data.startsWith('HORARIO:')) {
        const hora = data.replace('HORARIO:', '');
        enviarAvisoTelegram(`⏰ *Sugestão de Horário:* Marcaram o compromisso oficial do ao mosso para às *${hora}*! ✨`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
