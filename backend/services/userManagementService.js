const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

const validRoles = ['user', 'admin', 'recruiter'];
const editableFields = ['name', 'email', 'phone', 'location', 'skills', 'education', 'experience', 'profilePicture'];

const isMongoose = Boolean(UserModel.schema);
const isSequelize = Boolean(UserModel.sequelize);

const sanitizeUser = (user) => {
  if (!user) return null;

  let raw = user;
  if (typeof user.toObject === 'function') {
    raw = user.toObject();
  } else if (typeof user.toJSON === 'function') {
    raw = user.toJSON();
  }

  const {
    password,
    resetToken,
    resetTokenExpiry,
    resetPasswordToken,
    resetPasswordExpire,
    verificationToken,
    verificationTokenExpires,
    otp,
    otpExpires,
    refreshToken,
    __v,
    ...safeUser
  } = raw;

  if (safeUser._id && !safeUser.id) {
    safeUser.id = safeUser._id.toString();
  }

  return safeUser;
};

const buildUserFilters = ({ role, isVerified, search }) => {
  const filters = {};

  if (role) filters.role = role;
  if (isVerified !== undefined) filters.isVerified = isVerified === 'true';

  if (search) {
    if (isMongoose) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    } else if (isSequelize) {
      const { Op } = require('sequelize');
      filters[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
  }

  return filters;
};

const getUsers = async ({ page = 1, limit = 50, role, isVerified, search }) => {
  const parsedLimit = parseInt(limit, 10);
  const parsedPage = Math.max(parseInt(page, 10), 1);
  const offset = (parsedPage - 1) * parsedLimit;
  const filters = buildUserFilters({ role, isVerified, search });

  if (isMongoose) {
    const query = UserModel.find(filters)
      .select('-password -resetToken -resetTokenExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationTokenExpires -otp -otpExpires -refreshToken')
      .sort({ createdAt: -1 });

    let users;
    if (parsedLimit === 0) {
      users = await query.lean();
    } else {
      users = await query.limit(parsedLimit).skip(offset).lean();
    }

    const total = await UserModel.countDocuments(filters);

    return {
      users,
      pagination: {
        total,
        page: parsedLimit === 0 ? 1 : parsedPage,
        pages: parsedLimit === 0 ? 1 : Math.ceil(total / parsedLimit),
        limit: parsedLimit === 0 ? total : parsedLimit,
      },
    };
  }

  if (parsedLimit === 0) {
    const rows = await UserModel.findAll({
      where: filters,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'resetPasswordToken', 'resetPasswordExpire', 'verificationToken', 'verificationTokenExpires', 'otp', 'otpExpires', 'refreshToken'] },
      raw: true,
    });

    return {
      users: rows,
      pagination: {
        total: rows.length,
        page: 1,
        pages: 1,
        limit: rows.length,
      },
    };
  }

  const { count, rows } = await UserModel.findAndCountAll({
    where: filters,
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset,
    attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'resetPasswordToken', 'resetPasswordExpire', 'verificationToken', 'verificationTokenExpires', 'otp', 'otpExpires', 'refreshToken'] },
  });

  return {
    users: rows.map((user) => user.toJSON()),
    pagination: {
      total: count,
      page: parsedPage,
      pages: Math.ceil(count / parsedLimit),
      limit: parsedLimit,
    },
  };
};

const getUserById = async (id) => {
  let user;
  if (isMongoose) {
    user = await UserModel.findById(id)
      .select('-password -resetToken -resetTokenExpiry -resetPasswordToken -resetPasswordExpire -verificationToken -verificationTokenExpires -otp -otpExpires -refreshToken')
      .lean();
  } else {
    user = await UserModel.findByPk(id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'resetPasswordToken', 'resetPasswordExpire', 'verificationToken', 'verificationTokenExpires', 'otp', 'otpExpires', 'refreshToken'] },
    });
    if (user) user = user.toJSON();
  }

  return user;
};

const updateUser = async (id, data, adminId, req) => {
  const validUpdates = {};
  editableFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      validUpdates[field] = data[field];
    }
  });

  let user;
  if (isMongoose) {
    user = await UserModel.findById(id);
  } else {
    user = await UserModel.findByPk(id);
  }

  if (!user) {
    throw new Error('User not found');
  }

  Object.assign(user, validUpdates);
  await user.save();

  await logAuditEvent(adminId, 'user_updated', 'user', id, { updatedFields: Object.keys(validUpdates) }, req);

  return await getUserById(id);
};

const setUserVerification = async (id, isVerified, adminId, req, reason = 'Admin action') => {
  let user;
  if (isMongoose) {
    user = await UserModel.findById(id);
  } else {
    user = await UserModel.findByPk(id);
  }

  if (!user) {
    throw new Error('User not found');
  }

  user.isVerified = isVerified;
  await user.save();

  const action = isVerified ? 'user_activated' : 'user_deactivated';
  await logAuditEvent(adminId, action, 'user', id, { reason }, req);

  return await getUserById(id);
};

const changeUserRole = async (id, role, adminId, req) => {
  if (!validRoles.includes(role)) {
    throw new Error('Invalid role. Must be user, admin, or recruiter');
  }

  let user;
  if (isMongoose) {
    user = await UserModel.findById(id);
  } else {
    user = await UserModel.findByPk(id);
  }

  if (!user) {
    throw new Error('User not found');
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  await logAuditEvent(adminId, 'user_role_changed', 'user', id, { oldRole, newRole: role }, req);

  return { oldRole, newRole: role, user: await getUserById(id) };
};

const softDeleteUser = async (id, reason, adminId, req) => {
  let user;
  if (isMongoose) {
    user = await UserModel.findById(id);
  } else {
    user = await UserModel.findByPk(id);
  }

  if (!user) {
    throw new Error('User not found');
  }

  const currentEmail = user.email || `deleted_${Date.now()}@example.com`;
  user.isVerified = false;
  user.email = `${currentEmail}.deleted.${Date.now()}`;
  await user.save();

  await logAuditEvent(adminId, 'user_deleted', 'user', id, { reason }, req);

  return true;
};

const bulkUpdateUserStatus = async (ids, isVerified, adminId, req) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids array is required');
  }

  let updatedCount = 0;
  if (isMongoose) {
    const result = await UserModel.updateMany({ _id: { $in: ids } }, { isVerified });
    updatedCount = result.modifiedCount || 0;
  } else {
    const [count] = await UserModel.update({ isVerified }, { where: { id: ids } });
    updatedCount = count;
  }

  await logAuditEvent(adminId, 'bulk_user_status_update', 'user', null, { count: updatedCount, isVerified }, req);
  return updatedCount;
};

const bulkChangeUserRoles = async (ids, role, adminId, req) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids array is required');
  }

  if (!validRoles.includes(role)) {
    throw new Error('Invalid role. Must be user, admin, or recruiter');
  }

  let updatedCount = 0;
  if (isMongoose) {
    const result = await UserModel.updateMany({ _id: { $in: ids } }, { role });
    updatedCount = result.modifiedCount || 0;
  } else {
    const [count] = await UserModel.update({ role }, { where: { id: ids } });
    updatedCount = count;
  }

  await logAuditEvent(adminId, 'bulk_user_role_change', 'user', null, { count: updatedCount, newRole: role }, req);
  return updatedCount;
};

const impersonateUser = async (id) => {
  let user;
  if (isMongoose) {
    user = await UserModel.findById(id).lean();
  } else {
    user = await UserModel.findByPk(id);
    if (user) user = user.toJSON();
  }

  if (!user) {
    throw new Error('User not found');
  }

  const token = jwt.sign(
    { id: user._id ? user._id.toString() : user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '20m' }
  );

  return {
    token,
    user: sanitizeUser(user),
  };
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  setUserVerification,
  changeUserRole,
  softDeleteUser,
  bulkUpdateUserStatus,
  bulkChangeUserRoles,
  impersonateUser,
  validRoles,
};
