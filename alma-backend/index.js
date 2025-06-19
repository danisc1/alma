require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const usuariosRoutes = require('./routes/usuarios');
const psicologoRoutes = require('./routes/psicologo');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas com prefixo
app.use('/usuarios', usuariosRoutes);
app.use('/psicologo', psicologoRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');

    // Se quiser criar/atualizar as tabelas conforme modelos:
    // await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao conectar ao banco:', error);
  }
}

start();
