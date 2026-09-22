const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos da pasta atual ou 'www' (ajuste se usar Capacitor)
app.use(express.static(path.join(__dirname, '.')));

let placar = {
    sim: 0,
    nao: 0
};

io.on('connection', (socket) => {
    console.log('Um utilizador conectou-se:', socket.id);

    // Envia o placar atual assim que o cliente conecta
    socket.emit('atualizar-placar', placar);

    // Recebe respostas do cliente
    socket.on('resposta', (tipo) => {
        if (tipo === 'SIM') {
            placar.sim++;
        } else if (tipo === 'NAO') {
            placar.nao++;
        } else if (tipo.startsWith('HORARIO:')) {
            // Aqui pode tratar horários personalizados se quiser guardar no backend
            placar.sim++;
        }

        // Transmite o placar atualizado para todos os conectados
        io.emit('atualizar-placar', placar);
    });

    socket.on('disconnect', () => {
        console.log('Utilizador desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
