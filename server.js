// server.js
const net = require('net');

const server = net.createServer((socket) => {
  console.log('Cliente conectado');

  socket.on('data', (data) => {
    console.log('Recebido:', data.toString());
    socket.write('Mensagem recebida com sucesso!\n');
  });

  socket.on('end', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(3000, () => {
  console.log('Servidor TCP ouvindo na porta 3000');
});