#!/usr/bin/env tsx

/**
 * Manage local roles and identity links; users are provisioned by the orchestrator.
 * Usage:
 *   npm run users -- list
 *   npm run users -- remove <username>
 *   npm run users -- role <username> <admin|user>
 *   npm run users -- link <username> <orchestrator-username>
 * Link merges the source orchestrator row into the target, retaining target
 * preferences/role and deleting the source and its preferences.
 */
import { getDb, migrateOrchestratorIdentity } from "../src/lib/db/sqlite";
import {
  linkUsers,
  listManagedUsers,
  removeManagedUser,
  setUserRole,
} from "../src/lib/auth/user-management";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const arity: Record<string, number> = {
    list: 0,
    remove: 1,
    role: 2,
    link: 2,
  };
  if (!(command in arity) || args.length !== arity[command]) {
    throw new Error(
      "Usage: npm run users -- <list|remove|role|link> (see scripts/users.ts)",
    );
  }
  const db = await getDb();
  if (!db) {
    throw new Error("Auth database unavailable");
  }
  migrateOrchestratorIdentity(db);
  switch (command) {
    case "list": {
      const users = listManagedUsers(db);
      if (users.length === 0) {
        console.log(
          "No local users. Users are created on orchestrator sign-in.",
        );
      }
      for (const user of users) {
        const linked = user.iss !== null && user.sub !== null;
        console.log(
          `${user.username} [${user.role}] linked=${linked} ` +
            `${user.email ?? ""} created ${user.createdAt}`,
        );
      }
      break;
    }
    case "remove":
      removeManagedUser(db, args[0]);
      console.log("User removed");
      break;
    case "role":
      setUserRole(db, args[0], args[1]);
      console.log("Role updated");
      break;
    case "link":
      linkUsers(db, args[0], args[1]);
      console.log("Users merged; target preferences and role retained");
      break;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
