require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para verificar token JWT e colocar o usuário no req.user
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ erro: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token mal formatado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ erro: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Rota para cadastrar usuário
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, tipo_usuario } = req.body;
  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }
  if (tipo_usuario !== 'paciente' && tipo_usuario !== 'psicologo') {
    return res.status(400).json({ erro: 'Tipo de usuário inválido' });
  }

  try {
    const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    if (rowCount > 0) {
      return res.status(400).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, $4)',
      [nome, email, senhaHash, tipo_usuario]
    );

    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Preencha email e senha' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = rows[0];

    if (!usuario) {
      return res.status(400).json({ erro: 'Usuário ou senha inválidos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(400).json({ erro: 'Usuário ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, tipo_usuario: usuario.tipo_usuario },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para pegar perfil (protegida)
app.get('/perfil', autenticarToken, async (req, res) => {
  try {
    const { id } = req.user;
    const { rows } = await pool.query('SELECT id, nome, email, tipo_usuario FROM usuarios WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para registrar humor (só paciente)
app.post('/humor', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'paciente') {
    return res.status(403).json({ erro: 'Apenas pacientes podem registrar humor' });
  }

  const { nota, comentario } = req.body;
  if (!nota) {
    return res.status(400).json({ erro: 'Nota do humor é obrigatória' });
  }

  try {
    await pool.query(
      'INSERT INTO humor (usuario_id, nota, comentario) VALUES ($1, $2, $3)',
      [req.user.id, nota, comentario || null]
    );
    res.status(201).json({ mensagem: 'Humor registrado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para listar humores do paciente logado com paginação
app.get('/humor', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'paciente') {
    return res.status(403).json({ erro: 'Apenas pacientes podem acessar seus humores' });
  }

  const usuarioId = req.user.id;
  const limit = parseInt(req.query.limit) || 5;    // padrão: 5 por página
  const offset = parseInt(req.query.offset) || 0;  // padrão: começa do 0

  try {
    const resultado = await pool.query(
      'SELECT id, nota, comentario, data_registro FROM humor WHERE usuario_id = $1 ORDER BY data_registro DESC LIMIT $2 OFFSET $3',
      [usuarioId, limit, offset]
    );

    const totalQuery = await pool.query(
      'SELECT COUNT(*) FROM humor WHERE usuario_id = $1',
      [usuarioId]
    );
    const total = parseInt(totalQuery.rows[0].count);

    res.json({
      total,
      registros: resultado.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});


// Rota para psicólogo listar pacientes
app.get('/pacientes', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'psicologo') {
    return res.status(403).json({ erro: 'Apenas psicólogos podem acessar esta rota' });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE tipo_usuario = 'paciente' ORDER BY nome"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para psicólogo buscar histórico de humor de um paciente pelo id
app.get('/humor/paciente/:id', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'psicologo') {
    return res.status(403).json({ erro: 'Apenas psicólogos podem acessar esta rota' });
  }

  const pacienteId = req.params.id;

  try {
    const { rows } = await pool.query(
      'SELECT id, nota, comentario, data_registro FROM humor WHERE usuario_id = $1 ORDER BY data_registro DESC',
      [pacienteId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para exclusão da conta (protegida)
app.delete('/usuarios/excluir', autenticarToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.user.id]);
    res.json({ mensagem: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ erro: 'Erro ao excluir conta' });
  }
});

const crypto = require('crypto');

app.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    return res.status(400).json({ erro: 'Token e nova senha são obrigatórios' });
  }

  try {
    const { rows } = await pool.query('SELECT usuario_id FROM tokens WHERE token = $1', [token]);
    const tokenData = rows[0];
    if (!tokenData) {
      return res.status(400).json({ erro: 'Token inválido' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, tokenData.usuario_id]);
    await pool.query('DELETE FROM tokens WHERE token = $1', [token]);

    res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend ALMA rodando na porta ${PORT}`);
});
