const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuração do Telegram (use o seu Token e Chat ID existentes)
const TELEGRAM_BOT_TOKEN = 'SEU_TOKEN_AQUI';
const TELEGRAM_CHAT_ID = 'SEU_CHAT_ID_AQUI';

function enviarMensagemTelegram(texto) {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'SEU_TOKEN_AQUI') return;
    
    const dados = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: texto,
        parse_mode: 'Markdown'
    });

    const opcoes = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': dados.length
        }
    };

    const req = https.request(opcoes, (res) => {
        // Mensagem enviada com sucesso para o Telegram
    });

    req.on('error', (erro) => {
        console.error('Erro no Telegram:', erro);
    });

    req.write(dados);
    req.end();
}

// Servir arquivos estáticos (como o index.html, imagens, etc.)
app.use(express.static('public'));

let placar = {
    sim: 0,
    nao: 0
};

io.on('connection', (socket) => {
    // Envia o placar atual assim que alguém se conecta
    socket.emit('atualizar-placar', placar);

    socket.on('resposta', (escolha) => {
        if (escolha === 'SIM') {
            placar.sim++;
            io.emit('atualizar-placar', placar);
            
            // Dispara a mensagem no Telegram quando liberado
            enviarMensagemTelegram("🚨🍽️ *ATENÇÃO PESSOAL!* Já pode ao mossar! Liberado com sucesso! 🎉");
        } 
        else if (escolha === 'NAO') {
            placar.nao++;
            io.emit('atualizar-placar', placar);
        }
        else if (typeof escolha === 'string' && escolha.startsWith('HORARIO:')) {
            const horario = escolha.split(':')[1];
            io.emit('atualizar-placar', placar);
            
            // Dispara mensagem personalizada no Telegram com o horário sugerido
            enviarMensagemTelegram(`⏰ *Novo horário sugerido para o ao mosso:* ${horario}! 🍽️`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
