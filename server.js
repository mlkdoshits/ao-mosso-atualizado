const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
    io.emit('nova-resposta', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
