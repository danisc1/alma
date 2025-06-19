const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  senha_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipo_usuario: {
    type: DataTypes.ENUM('paciente', 'psicologo'),
    allowNull: false
  },
  foto_url: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

module.exports = Usuario;
