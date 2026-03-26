import bcrypt from "bcrypt";
import { pbkdf2 } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

const isLegacyPbkdf2Hash = (hash) => /^[a-f0-9]{64}$/i.test(hash || "");

export async function encrypt(password) {
  return bcrypt.hash(password, 12);
}

export async function compare(password, hash) {
  if (isLegacyPbkdf2Hash(hash)) {
    const key = await pbkdf2Async(
      password,
      process.env.PASSWORD_SALT,
      10,
      32,
      "sha512"
    );

    return key.toString("hex") === hash;
  }

  return bcrypt.compare(password, hash);
}
