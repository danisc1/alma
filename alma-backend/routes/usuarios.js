// routes/usuarios.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Humor = require('../models/Humor');
const autenticarToken = require('../middleware/auth');

// Rota para excluir a conta do usuário autenticado
router.delete('/usuarios/excluir', autenticarToken, async (req, res) => {
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
 