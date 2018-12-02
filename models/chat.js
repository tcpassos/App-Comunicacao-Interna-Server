const db = require('knex')({
    client: 'mysql2',
    connection: {
      host : '127.0.0.1',
      user : 'root',
      password : 'Cthulhu.Waits.Dreaming',
      database : 'chat_brazpine'
    }
});

const atualizarConversas = (usuario) => {
  let conversas = [];

  return db('conversas').select('*')
  .where('usuario1', usuario)
  .orWhere('usuario2', usuario)
  .orderBy('ultima_mensagem', 'desc')
    .then((rows) => {
        for (row of rows) {
          if (row['usuario1'] == usuario) {
            conversas.push( row['usuario2'] );
          } else {
            conversas.push( row['usuario1'] );
          }
        }

        return conversas;
    }).catch((err) => { console.log( err); throw err });
}

const carregarMensagens = (req, res) => {
  let mensagens = [];

  db('mensagens').select('*')
  .where({origem: req.body.usuarioAtual.id, destino: req.body.usuarioConversa.id})
  .orWhere({origem: req.body.usuarioConversa.id, destino: req.body.usuarioAtual.id})
  .then((rows) => {
      for (row of rows) {
        const mensagem = {
          "id": row['id'],
          "origem": row['origem'],
          "destino": row['destino'],
          "texto": row['texto']
        };

        mensagens.push( mensagem );
      }
  }).catch((err) => { console.log( err ); throw err })
  .finally(() => {
      res.json(mensagens);
  });
}

const salvarMensagem = (msg) => {
  // procura pela conversa entre os dois usuarios
  getConversa(msg.origem, msg.destino).then( (id_conversa) => {

    // caso a conversa nao exista
    if(!id_conversa) {

      // cria uma nova conversa no banco de dados
      criarConversa(msg.origem, msg.destino)
      .then( () => salvarMensagem(msg) );

    } else {

      // insere a mensagem no banco de dados
      db('mensagens').insert({
        origem: msg.origem,
        destino: msg.destino,
        texto: msg.texto,
        id_conversa: id_conversa
      })
      .returning('id')
      .then( (id) => {
        // atualiza a conversa com a ultima mensagem
        db('conversas')
        .where('id', id_conversa)
        .update({
          ultima_mensagem: id,
          thisKeyIsSkipped: undefined
        })
        .catch((err) => { console.log( err ); throw err });;
      })
      .catch((err) => { console.log( err ); throw err });
    }

  });

}

// obtem id da conversa se existir
const getConversa = (usuario1, usuario2) => {
  return db('conversas').select('id')
  .where({usuario1: usuario1, usuario2: usuario2})
  .orWhere({usuario1: usuario2, usuario2: usuario1})
  .then( (data) => {
    if(data.length > 0) {
      return data[0].id;
    } else {
      return false;
    }
  });
}

// cria uma nova conversa no banco de dados
const criarConversa = (usuario1, usuario2) => {
  return db.raw(
    "INSERT INTO conversas (usuario1, usuario2) VALUES (?, ?)",
    [usuario1, usuario2]
  )
  .catch((err) => { console.log( err); throw err });
}

// Exporta os metodos
module.exports = {
  carregarMensagens,
  salvarMensagem,
  atualizarConversas
}