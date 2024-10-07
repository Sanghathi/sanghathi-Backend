import { pbkdf2 } from "crypto";

import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

export async function encrypt(password) {
  try{
  const key = await pbkdf2Async(
    password,
    process.env.PASSWORD_SALT,
    10,
    32,
    "sha512"
  );

  return Promise.resolve(key.toString("hex"));
}catch (error) {
  console.error("Error in encrypting password:", error);
  throw error;
}
}

export async function compare(password, hash) {
  const key = await pbkdf2Async(
    password,
    process.env.PASSWORD_SALT,
    10,
    32,
    "sha512"
  );

  return Promise.resolve(key.toString("hex") === hash);
}
