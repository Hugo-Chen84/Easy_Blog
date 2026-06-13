import { DataTypes } from 'sequelize'

export default (sequelize) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // GitHub Device Flow 登录所用字段（未配置时可为空，首次 GitHub 登录时写入）
    githubId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // 管理员标识（默认 false）
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'users',
    timestamps: true
  })
}
