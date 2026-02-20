import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    linkedPatientId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      linkedPatientId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    linkedPatientId?: string | null;
  }
}
