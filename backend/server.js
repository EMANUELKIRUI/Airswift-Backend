const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { User } = require('./models');
const { hashPassword } = require('./utils/auth');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));

// Africa's Talking payment callback
app.post('/api/payment/callback', async (req, res) => {
  const { status, metadata } = req.body;

  if (status === 'Success' && metadata && metadata.payment_id) {
    await Payment.update({ status: 'completed' }, { where: { id: metadata.payment_id } });
  }

  res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Sync database
const { sequelize } = require('./models');
sequelize.sync().then(async () => {
  console.log('Database synced');

  // Create default admin if not exists
  const adminEmail = 'emanuelkirui1@gmail.com';
  const adminPassword = 'Ee0795565529@';
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password_hash = await hashPassword(adminPassword);
    await User.create({
      name: 'Admin',
      email: adminEmail,
      password_hash,
      role: 'admin'
    });
    console.log('Default admin created');
  }
}).catch(err => console.error('Error syncing database:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;