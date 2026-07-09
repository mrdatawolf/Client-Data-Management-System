#!/usr/bin/env tsx

/**
 * User management CLI
 *
 * Usage:
 *   npm run users -- add <username> [--role admin|user] [--email <email>] [--password <password>]
 *   npm run users -- list
 *   npm run users -- passwd <username> [--password <password>]
 *   npm run users -- remove <username>
 *
 * If --password is omitted, you are prompted for it (input hidden).
 */

import * as readline from "readline";
import {
  createUser,
  listUsers,
  deleteUser,
  updateUserPassword,
  findUserByUsername,
} from "../src/lib/auth/db-sqlite";

const BREAK_GLASS_ID = "fallback-admin-001";

function getFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const anyRl = rl as any;
    process.stdout.write(question);
    anyRl._writeToOutput = () => {};
    rl.question("", (answer) => {
      anyRl._writeToOutput =
        Object.getPrototypeOf(anyRl)._writeToOutput;
      process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getPassword(args: string[], confirm: boolean): Promise<string> {
  const fromFlag = getFlag(args, "password");
  if (fromFlag) return fromFlag;

  const password = await promptHidden("Password: ");
  if (!password) {
    console.error("✗ Password cannot be empty");
    process.exit(1);
  }
  if (confirm) {
    const again = await promptHidden("Confirm password: ");
    if (password !== again) {
      console.error("✗ Passwords do not match");
      process.exit(1);
    }
  }
  return password;
}

async function cmdAdd(args: string[]) {
  const username = args[0];
  if (!username || username.startsWith("--")) {
    console.error("Usage: npm run users -- add <username> [--role admin|user] [--email <email>] [--password <password>]");
    process.exit(1);
  }

  const role = getFlag(args, "role") || "user";
  if (role !== "admin" && role !== "user") {
    console.error(`✗ Invalid role "${role}" — use "admin" or "user"`);
    process.exit(1);
  }

  const password = await getPassword(args, true);
  const user = await createUser(username, password, getFlag(args, "email"), role);
  console.log(`✓ Created user "${user.username}" (role: ${user.role})`);
}

async function cmdList() {
  const users = await listUsers();
  if (users.length === 0) {
    console.log("No users found. Create one with: npm run users -- add <username> --role admin");
    return;
  }
  for (const u of users) {
    const email = u.email ? `  <${u.email}>` : "";
    console.log(`${u.username}  [${u.role}]${email}  created ${u.createdAt}`);
  }
  if (process.env.FALLBACK_ADMIN_USERNAME) {
    console.log(`\n(break-glass admin "${process.env.FALLBACK_ADMIN_USERNAME}" is also active via .env)`);
  }
}

async function requireDbUser(username: string) {
  const user = await findUserByUsername(username);
  if (!user) {
    console.error(`✗ User "${username}" not found`);
    process.exit(1);
  }
  if (user.id === BREAK_GLASS_ID) {
    console.error(`✗ "${username}" is the break-glass admin — manage it via FALLBACK_ADMIN_* in .env`);
    process.exit(1);
  }
  return user;
}

async function cmdPasswd(args: string[]) {
  const username = args[0];
  if (!username || username.startsWith("--")) {
    console.error("Usage: npm run users -- passwd <username> [--password <password>]");
    process.exit(1);
  }
  const user = await requireDbUser(username);
  const password = await getPassword(args, true);
  await updateUserPassword(user.id, password);
  console.log(`✓ Password updated for "${username}"`);
}

async function cmdRemove(args: string[]) {
  const username = args[0];
  if (!username) {
    console.error("Usage: npm run users -- remove <username>");
    process.exit(1);
  }
  const user = await requireDbUser(username);
  await deleteUser(user.id);
  console.log(`✓ Removed user "${username}"`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "add":
      return cmdAdd(args);
    case "list":
      return cmdList();
    case "passwd":
      return cmdPasswd(args);
    case "remove":
      return cmdRemove(args);
    default:
      console.error("Usage: npm run users -- <add|list|passwd|remove> ...");
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗", error instanceof Error ? error.message : error);
    process.exit(1);
  });
