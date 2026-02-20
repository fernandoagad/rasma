import * as fs from "fs";
import * as path from "path";

// Load .env.local before any other imports
const envPath = path.join(__dirname, "..", ".env.local");
const env = fs.readFileSync(envPath, "utf8");
for (const line of env.split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0 && !line.startsWith("#")) {
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    process.env[key] = val;
  }
}

async function main() {
  const { db } = await import("../src/lib/db");
  const { systemSettings } = await import("../src/lib/db/schema");

  const foundationInfo = {
    name: "Fundación RASMA",
    legalName: "Fundación Renato Aguirre para la Salud Mental y Trastornos del Espectro Autista",
    rut: "",
    address: "Comuna de Illapel, Illapel, Región de Coquimbo",
    legalRepresentative: "Barbara Carolina Adriazola Dabed",
    incorporationDate: "26-08-2024",
    registrationNumber: "367975",
    email: "",
    phone: "",
    nature: "Fundación",
    status: "Vigente",
    boardMembers: [
      { role: "Presidente", name: "Barbara Carolina Adriazola Dabed", rut: "13.772.629-7" },
      { role: "Secretario", name: "Joaquín Ignacio Aguirre Adriazola", rut: "20.676.550-K" },
      { role: "Tesorero", name: "Fernando Patricio Aguirre Carroza", rut: "12.885.035-K" },
      { role: "Director", name: "Fernando Javier Aguirre Adriazola", rut: "20.296.555-5" },
      { role: "Director", name: "Lorena Cecilia Aguirre Carroza", rut: "9.800.578-1" },
    ],
  };

  console.log("Seeding foundation info...");

  await db
    .insert(systemSettings)
    .values({
      key: "foundation_info",
      value: JSON.stringify(foundationInfo),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: JSON.stringify(foundationInfo), updatedAt: new Date() },
    });

  console.log("Foundation info seeded successfully!");
  console.log(JSON.stringify(foundationInfo, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed foundation info:", err);
  process.exit(1);
});
