const db = require('knex')({
    client: 'mysql2',
    connection: {
      host : '127.0.0.1',
      user : 'root',
      password : 'Cthulhu.Waits.Dreaming',
      database : 'chat_brazpine'
    }
});
const bcrypt = require('bcrypt');
const crypto = require('crypto');


// Cadastra um novo usuario
const cadastro = (req, res) => {
  const usuario = req.body;
  console.log(usuario);

  hashSenha(usuario.senha)
    .then((senhaCriptografada) => {
      delete usuario.senha
      usuario.senha_cryp = senhaCriptografada;
    })
    .then(() => criarToken())
    .then(token => usuario.token = token)
    .then(() => criarUsuario(usuario))
    .then(usuario => {
      delete usuario.senha_cryp
      res.status(201).json({ usuario })
    })
    .catch((err) => console.error(err))
}

// Login
const login = (req, res) => {
  const usuarioReq = req.body;
  let usuario;

  acharUsuario(usuarioReq.login)
    .then(usuarioEncontrado => {

      if(!usuarioEncontrado) {
        res.status(500).send(new Error('Usuário inválido'));
      }

      usuario = usuarioEncontrado;
      return checarSenha(usuarioReq.senha, usuarioEncontrado)
      .catch( (err) => {
        res.status(500).send(err);
      });
    })
    .then((senhaConfere) => criarToken())
    .then(token => atualizarToken(token, usuario))
    .then(() => {
      delete usuario.senha;
      res.status(200).json(usuario);
    })
    .catch((err) => console.error(err));
}

// Verifica se o nome de usuario esta disponivel
const checarUsuario = (req, res) => {
  const login = req.body.login;
  
  db('usuarios')
  .select(db.raw('count(*) as CNT'))
  .where('login', login)
  .then(function(total) {
    res.send({
      meta: {
        total: total[0].CNT
      }
    });
  });
}

// Lista os Usuarios
const listarUsuarios = (req, res) => {

  let usuarios = [];

  db('usuarios').select('*')
    .then((rows) => {
        for (row of rows) {
          const usuario = {
            "id": row['id'],
            "nome": row['nome'],
            "login": row['login']
          };

          usuarios.push( usuario );
        }
    }).catch((err) => { console.log( err); throw err })
    .finally(() => {
        res.json(usuarios);
    });
}

// Retorna informacoes de um usuario especifico
const perfil = (req, res) => {
  acharUsuario(req.query.u).then( (usuario) => {
    res.send(usuario);
  })
}

// Helpers -------------------------------------------------------------------------

const acharUsuario = (login) => {
  return db('usuarios').where('login', login)
    .then(function (data){
      return data[0];
    });
}

const checarSenha = (senhaReq, usuarioEncontrado) => {
  return new Promise((resolve, reject) =>
    bcrypt.compare(senhaReq, usuarioEncontrado.senha, (err, response) => {
        if (err) {
          reject(err)
        }
        else if (response) {
          resolve(response)
        } else {
          reject(new Error('Senhas diferentes.'))
        }
    })
  )
}

const atualizarToken = (token, usuario) => {
  return db.raw("UPDATE usuarios SET token = ? WHERE id = ?", [token, usuario.id])
    .then((data) => data[0])
}

const hashSenha = (senha) => {
  return new Promise((resolve, reject) =>
    bcrypt.hash(senha, 10, (err, hash) => {
      err ? reject(err) : resolve(hash)
    })
  )
}

const criarUsuario = (usuario) => {
  return db.raw(
    "INSERT INTO usuarios (nome, login, senha, nascimento, perfil, token) VALUES (?, ?, ?, ?, ?, ?)",
    [usuario.nome, usuario.login, usuario.senha_cryp, usuario.nascimento, usuario.perfil, usuario.token]
  );
}

const criarToken = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, data) => {
      err ? reject(err) : resolve(data.toString('base64'))
    })
  })
}

// Exporta os metodos
module.exports = {
  cadastro,
  login,
  checarUsuario,
  listarUsuarios,
  perfil
}