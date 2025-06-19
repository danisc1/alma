// routes/psicologo.js
const express = require('express');
const router = express.Router();
const Humor = require('../models/Humor');
const Usuario = require('../models/Usuario');
const autenticarToken = require('../middleware/auth');

router.get('/humor/paciente/:id', autenticarToken, async (req, res) => {
  try {
    // Só psicólogo pode acessar aqui
    if (req.usuario.tipo_usuario !== 'psicologo') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const pacienteId = req.params.id;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;

    // Verifica se paciente existe
    const paciente = await Usuario.findOne({ where: { id: pacienteId, tipo_usuario: 'paciente' } });
    if (!paciente) return res.status(404).json({ erro: 'Paciente não encontrado' });

    const total = await Humor.count({ where: { usuario_id: pacienteId } });
    const registros = await Humor.findAll({
      where: { usuario_id: pacienteId },
      order: [['data_registro', 'DESC']],
      limit,
      offset
    });

    res.json({ total, registros });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

module.exports = router;
