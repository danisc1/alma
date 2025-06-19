const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const Humor = sequelize.define('Humor', {
  nota: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  comentario: {
    type: DataTypes.TEXT
  },
  data_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'humor',
  timestamps: false
});

Humor.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Usuario.hasMany(Humor, { foreignKey: 'usuario_id' });

module.exports = Humor;
