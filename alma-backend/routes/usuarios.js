// routes/usuarios.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Humor = require('../models/Humor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const autenticarToken = require('../middleware/auth');

// Rota login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(401).json({ erro: 'Email ou senha incorretos' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ erro: 'Email ou senha incorretos' });

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota para excluir a conta do usuário autenticado
router.delete('/excluir', autenticarToken, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Exclui os registros de humor do usuário
    await Humor.destroy({ where: { usuario_id: usuarioId } });

    // Exclui o próprio usuário
    await Usuario.destroy({ where: { id: usuarioId } });

    res.json({ mensagem: 'Conta excluída com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir conta' });
  }
});

module.exports = router;
