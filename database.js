// filepath: /Users/oguzhancetinkaya/Code/rq-analysis-agent/rq-analysis-agent/database.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

const Project = sequelize.define('Project', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const Document = sequelize.define('Document', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const Message = sequelize.define('Message', {
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender: {
    type: DataTypes.ENUM('ai', 'user'),
    allowNull: false
  }
});

Project.hasMany(Document, { onDelete: 'CASCADE' });
Document.belongsTo(Project);

Project.hasMany(Message, { onDelete: 'CASCADE' });
Message.belongsTo(Project);

module.exports = { sequelize, Project, Document, Message };