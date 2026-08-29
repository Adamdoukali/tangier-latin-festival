import { createServerFn } from "@tanstack/react-start";

interface ServerAdminAccount {
  id: string;
  name: string;
  email: string;
  password: string;
}

const PRIMARY_ADMIN: ServerAdminAccount = {
  id: "primary-admin",
  name: "Primary Admin",
  email: "admin@tangierlatinfestival.com",
  password: "TLFadmin2027",
};

function serverAccounts(): ServerAdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS;
  if (!raw) return [PRIMARY_ADMIN];
  try {
    const parsed = JSON.parse(raw) as Array<Partial<ServerAdminAccount>>;
    const configured = parsed
      .filter((account) => account.email && account.password)
      .map((account, index) => ({
        id: account.id?.trim() || `admin-${index + 2}`,
        name: account.name?.trim() || account.email!.trim(),
        email: account.email!.trim().toLowerCase(),
        password: account.password!,
      }));
    return [
      PRIMARY_ADMIN,
      ...configured.filter((account) => account.email !== PRIMARY_ADMIN.email),
    ];
  } catch (error) {
    console.error("[admin-auth] ADMIN_ACCOUNTS is not valid JSON.", error);
    return [PRIMARY_ADMIN];
  }
}

export const verifyAdminCredentials = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const account = serverAccounts().find(
      (candidate) => candidate.email === email && candidate.password === data.password,
    );
    if (!account) return { success: false as const };
    return {
      success: true as const,
      admin: { id: account.id, name: account.name, email: account.email },
    };
  });
