// middlewares/authMiddleware.js
import AppError from "../utils/appError.js";

const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        new AppError("Unauthorized access. User or role not found.", 403)
      );
    }

    const userPermissions = req.user.role.permissions;

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(
        new AppError("Unauthorized access. Insufficient permissions.", 403)
      );
    }

    next();
  };
};

export { authorizePermissions };
