const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  senha_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipo_usuario: {
    type: DataTypes.STRING,
    allowNull: false
  },
  foto_url: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

module.exports = Usuario;
