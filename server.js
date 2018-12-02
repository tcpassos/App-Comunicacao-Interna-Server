var usuario = require('./models/usuario.js');
var chat = require('./models/chat.js');
const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { origins: '*:*' });

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// para cross-origin-requests
const cors = require('cors');
app.use(cors());

// requisicoes
app.post('/cadastro', cors(), usuario.cadastro);
app.post('/login', cors(), usuario.login);
app.post('/check', cors(), usuario.checarUsuario);
app.get('/list', cors(), usuario.listarUsuarios);
app.get('/perfil', cors(), usuario.perfil);
app.post('/mensagens', cors(), chat.carregarMensagens);
 
// usuarios conectados por websocket
var usuariosConectados = [];
function logUsuarios() {
  console.log('Usuarios conectados:');
  console.log(usuariosConectados);
}

// usuario conectado
io.on('connection', socket => {
   const usuarioConectado = {
      id_usuario: socket.handshake.query.id,
      id_socket: socket.id
   };

   // remove usuarios duplicados
   let duplicado = usuariosConectados.findIndex(usuario => usuario.id_usuario == usuarioConectado.id_usuario);
   if(duplicado != -1) { usuariosConectados.splice(duplicado, 1); }

   // insere o novo usuario
   usuariosConectados.push(usuarioConectado);

   // atualiza conversas
   socket.on('conversas', (usuario) => {
    chat.atualizarConversas(usuario.id)
    .then( (conversas) => {
      socket.emit('conversas', conversas);
    });
   });

   logUsuarios();

   // armazena nova mensagem
   socket.on('mensagem', (msg) => {
      chat.salvarMensagem(msg);

      // encontra o usuario para quem a mensagem foi enviada
      let i = usuariosConectados.findIndex(usuario => usuario.id_usuario == msg.destino);
      
      if (i != -1) {
        socket.to(usuariosConectados[i].id_socket).emit('mensagem', msg);
      }
   });

   // desconecta usuario
   socket.on('disconnect', function() {
      let i = usuariosConectados.indexOf(socket);
      usuariosConectados.splice(i, 1);
   });
});

// servidor
server.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("servidor ativo em http://%s:%s", host, port);
 })