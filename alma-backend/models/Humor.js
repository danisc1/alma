const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Humor = sequelize.define('Humor', {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nota: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  data_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'humor',
  timestamps: false
});

module.exports = Humor;
