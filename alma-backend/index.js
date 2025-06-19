require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const sequelize = require('./config/database');
const Usuario = require('./models/Usuario');
const Humor = require('./models/Humor');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para validar o token JWT e proteger rotas
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

// Cadastro de usuário
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, tipo_usuario } = req.body;
  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }
  if (!['paciente', 'psicologo'].includes(tipo_usuario)) {
    return res.status(400).json({ erro: 'Tipo de usuário inválido' });
  }

  try {
    // Verifica se o email já está cadastrado
    const existente = await Usuario.findOne({ where: { email } });
    if (existente) return res.status(400).json({ erro: 'Email já cadastrado' });

    // Cria o hash da senha e salva o usuário
    const senha_hash = await bcrypt.hash(senha, 10);
    await Usuario.create({ nome, email, senha_hash, tipo_usuario });
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Login de usuário - retorna token JWT
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha email e senha' });

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ erro: 'Usuário ou senha inválidos' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(400).json({ erro: 'Usuário ou senha inválidos' });

    // Gera token JWT com validade de 8 horas
    const token = jwt.sign({ id: usuario.id, nome: usuario.nome, tipo_usuario: usuario.tipo_usuario }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para pegar dados do perfil do usuário autenticado
app.get('/perfil', autenticarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'nome', 'email', 'tipo_usuario', 'foto_url']
    });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Atualizar dados do perfil do usuário autenticado
app.patch('/perfil', autenticarToken, async (req, res) => {
  const { nome, email, foto_url } = req.body;
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    // Verifica se o email já está em uso por outro usuário
    if (email) {
      const outro = await Usuario.findOne({ where: { email, id: { [sequelize.Op.ne]: req.user.id } } });
      if (outro) return res.status(400).json({ erro: 'Email já em uso' });
    }

    await usuario.update({ nome: nome || usuario.nome, email: email || usuario.email, foto_url });
    res.json({ mensagem: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Registrar humor - só paciente pode registrar
app.post('/humor', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'paciente') return res.status(403).json({ erro: 'Apenas pacientes podem registrar humor' });
  const { nota, comentario } = req.body;
  if (!nota) return res.status(400).json({ erro: 'Nota do humor é obrigatória' });

  try {
    await Humor.create({ usuario_id: req.user.id, nota, comentario });
    res.status(201).json({ mensagem: 'Humor registrado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Buscar histórico de humor do paciente autenticado
app.get('/humor', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'paciente') return res.status(403).json({ erro: 'Apenas pacientes podem acessar seus humores' });

  const limit = parseInt(req.query.limit) || 5;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { count, rows } = await Humor.findAndCountAll({
      where: { usuario_id: req.user.id },
      order: [['data_registro', 'DESC']],
      limit,
      offset
    });
    res.json({ total: count, registros: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Psicólogo busca lista de pacientes
app.get('/pacientes', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'psicologo') return res.status(403).json({ erro: 'Apenas psicólogos podem acessar esta rota' });

  try {
    const pacientes = await Usuario.findAll({
      where: { tipo_usuario: 'paciente' },
      attributes: ['id', 'nome', 'email'],
      order: [['nome', 'ASC']]
    });
    res.json(pacientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Psicólogo busca histórico de humor de um paciente específico
app.get('/humor/paciente/:id', autenticarToken, async (req, res) => {
  if (req.user.tipo_usuario !== 'psicologo') return res.status(403).json({ erro: 'Apenas psicólogos podem acessar esta rota' });

  try {
    const historico = await Humor.findAll({
      where: { usuario_id: req.params.id },
      order: [['data_registro', 'DESC']]
    });
    res.json(historico);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Excluir conta do usuário autenticado
app.delete('/usuarios/excluir', autenticarToken, async (req, res) => {
  try {
    await Usuario.destroy({ where: { id: req.user.id } });
    res.json({ mensagem: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ erro: 'Erro ao excluir conta' });
  }
});

// Redefinir senha sem token (pelo email)
app.post('/redefinir-senha', async (req, res) => {
  const { email, novaSenha } = req.body;
  if (!email || !novaSenha) return res.status(400).json({ erro: 'Email e nova senha são obrigatórios' });

  try {
    // Cria hash da nova senha e atualiza no banco
    const senha_hash = await bcrypt.hash(novaSenha, 10);
    const [linhasAfetadas] = await Usuario.update(
      { senha_hash },
      { where: { email } }
    );

    if (linhasAfetadas === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Sincroniza banco e inicia servidor
sequelize.sync().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Backend ALMA rodando na porta ${PORT}`));
});
