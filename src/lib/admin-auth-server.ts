import { createServerFn } from "@tanstack/react-start";
import { scryptSync, timingSafeEqual } from "node:crypto";

interface ServerAdminAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
}

const PASSWORD_HASH_PREFIX = "TLF_ADMIN_LOGIN_V1";

// Keep only one-way password hashes in source control. ADMIN_ACCOUNTS remains
// supported so accounts can also be managed through Vercel without a code edit.
const DEFAULT_ADMIN_ACCOUNTS: ServerAdminAccount[] = [
  {
    id: "primary-admin",
    name: "Primary Admin",
    email: "admin@tangierlatinfestival.com",
    passwordHash: "81c669b51411d496b22b0ccd824f2b072d43f08ddc4c7c19880821f0de8d20c1",
  },
  {
    id: "admin-nouha",
    name: "Nouha",
    email: "nouhaberrada411@gmail.com",
    passwordHash: "c8f57b31a574b3b6b7eac6f651fa27382cab823a88f5443038a46b6d730481cc",
  },
  {
    id: "admin-safae",
    name: "Safae",
    email: "safae.bouti95@gmail.com",
    passwordHash: "5bb59f836e745ce54d66d2d837b9f17086d39a889ce9fb5e8805c91f1edfd0e4",
  },
  {
    id: "admin-badr",
    name: "Badr",
    email: "badr.bakkacha@gmail.com",
    passwordHash: "88aa4f9381eff3aea98902fc9aec5a6c188441dd2ee5e2c6118faa643c5fbf87",
  },
];

function hashPassword(email: string, password: string): string {
  return scryptSync(password, `${PASSWORD_HASH_PREFIX}:${email.toLowerCase()}`, 32).toString("hex");
}

function matchesPassword(account: ServerAdminAccount, password: string): boolean {
  if (account.passwordHash) {
    const supplied = Buffer.from(hashPassword(account.email, password), "hex");
    const expected = Buffer.from(account.passwordHash, "hex");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
  return account.password === password;
}

function serverAccounts(): ServerAdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS;
  if (!raw) return DEFAULT_ADMIN_ACCOUNTS;
  try {
    const parsed = JSON.parse(raw) as Array<Partial<ServerAdminAccount>>;
    const configured = parsed
      .filter((account) => account.email && (account.password || account.passwordHash))
      .map((account, index) => ({
        id: account.id?.trim() || `admin-${index + 2}`,
        name: account.name?.trim() || account.email!.trim(),
        email: account.email!.trim().toLowerCase(),
        password: account.password,
        passwordHash: account.passwordHash,
      }));
    return [
      ...DEFAULT_ADMIN_ACCOUNTS,
      ...configured.filter(
        (account) =>
          !DEFAULT_ADMIN_ACCOUNTS.some((defaultAccount) => defaultAccount.email === account.email),
      ),
    ];
  } catch (error) {
    console.error("[admin-auth] ADMIN_ACCOUNTS is not valid JSON.", error);
    return DEFAULT_ADMIN_ACCOUNTS;
  }
}

export const verifyAdminCredentials = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const account = serverAccounts().find(
      (candidate) => candidate.email === email && matchesPassword(candidate, data.password),
    );
    if (!account) return { success: false as const };
    return {
      success: true as const,
      admin: { id: account.id, name: account.name, email: account.email },
    };
  });
