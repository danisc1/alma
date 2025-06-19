// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const psicologoRoutes = require('./routes/psicologo');
const usuarioRoutes = require('./routes/usuarios');

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use(psicologoRoutes);
app.use(usuarioRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');
    // await sequelize.sync({ alter: true }); // use com cuidado

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao conectar ao banco:', error);
  }
}

start();
