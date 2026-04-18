const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  return ["1", "true", "yes", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const featureFlags = {
  messageReadFromParent: parseBoolean(
    process.env.FEATURE_MESSAGE_READ_FROM_PARENT,
    false
  ),
  messageDualWriteArrays: parseBoolean(
    process.env.FEATURE_MESSAGE_DUAL_WRITE_ARRAYS,
    true
  ),
};

export default featureFlags;
