import Role from '../models/Role.js';

// Controller to get role by name
export const getRoleByName = async (req, res) => {
  try {
    const roleName = req.params.role; // Get role name from URL parameter
    const role = await Role.findOne({ name: roleName });

    if (!role) {
      return res.status(404).json({ message: `Role ${roleName} not found` });
    }

    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller to get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
