import { pbkdf2 } from "crypto";

import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

export async function encrypt(password) {
  const key = await pbkdf2Async(
    password,
    process.env.PASSWORD_SALT,
    10,
    32,
    "sha512"
  );

  return Promise.resolve(key.toString("hex"));
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
