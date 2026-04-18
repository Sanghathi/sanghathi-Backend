import mongoose from "mongoose";

const toUserIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

export const buildProfilePhotoMap = async (userIds = []) => {
  const normalizedIds = Array.from(
    new Set(userIds.map(toUserIdString).filter(Boolean))
  );

  const objectIds = normalizedIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) {
    return new Map();
  }

  const [studentProfiles, facultyProfiles] = await Promise.all([
    mongoose
      .model("StudentProfile")
      .find({ userId: { $in: objectIds }, photo: { $exists: true, $ne: null } })
      .select("userId photo")
      .lean(),
    mongoose
      .model("FacultyProfile")
      .find({ userId: { $in: objectIds }, photo: { $exists: true, $ne: null } })
      .select("userId photo")
      .lean(),
  ]);

  const photoMap = new Map();

  studentProfiles.forEach((profile) => {
    if (profile.photo) {
      photoMap.set(String(profile.userId), profile.photo);
    }
  });

  facultyProfiles.forEach((profile) => {
    if (profile.photo) {
      photoMap.set(String(profile.userId), profile.photo);
    }
  });

  return photoMap;
};

export const enrichLeanUserAvatar = (user, photoMap) => {
  if (!user || typeof user !== "object") {
    return user;
  }

  const userId = toUserIdString(user._id || user.id || user.userId);
  if (!userId) {
    return user;
  }

  const photo = photoMap.get(userId);
  if (!photo) {
    return user;
  }

  return {
    ...user,
    avatar: photo,
    photo,
  };
};

export const getUserIdFromEntity = toUserIdString;
