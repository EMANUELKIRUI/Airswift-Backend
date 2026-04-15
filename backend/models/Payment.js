const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  service_type: {
    type: DataTypes.ENUM('visa_fee'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  checkoutRequestId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'checkout_request_id',
  },
  receiptNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'receipt_number',
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_id',
  },
  transactionDate: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_date',
  },
  accountReference: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'account_reference',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_sent',
  },
});

module.exports = Payment;