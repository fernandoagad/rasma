import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { users, patients, notificationPreferences } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("TURSO_DATABASE_URL is required");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.log("Seeding database...\n");

  // 1. Create admin user (contacto@rasma.cl)
  const adminPassword = await bcrypt.hash("Rasma2024!", 12);
  const [admin] = await db.insert(users).values({
    name: "Administrador RASMA",
    email: "contacto@rasma.cl",
    passwordHash: adminPassword,
    role: "admin",
    active: true,
    authProvider: "credentials",
    emailVerifiedAt: new Date(),
  }).returning({ id: users.id });

  console.log("✓ Admin user created:");
  console.log("  Email: contacto@rasma.cl");
  console.log("  Password: Rasma2024!");
  console.log(`  ID: ${admin.id}\n`);

  // 2. Create a therapist user
  const therapistPassword = await bcrypt.hash("Terapeuta2024!", 12);
  const [therapist] = await db.insert(users).values({
    name: "Dra. María González",
    email: "maria.gonzalez@rasma.cl",
    passwordHash: therapistPassword,
    role: "terapeuta",
    active: true,
    authProvider: "credentials",
    emailVerifiedAt: new Date(),
  }).returning({ id: users.id });

  console.log("✓ Therapist user created:");
  console.log("  Email: maria.gonzalez@rasma.cl");
  console.log("  Password: Terapeuta2024!");
  console.log(`  ID: ${therapist.id}\n`);

  // 3. Create a receptionist user
  const receptionistPassword = await bcrypt.hash("Recepcion2024!", 12);
  const [receptionist] = await db.insert(users).values({
    name: "Carolina Muñoz",
    email: "carolina.munoz@rasma.cl",
    passwordHash: receptionistPassword,
    role: "recepcionista",
    active: true,
    authProvider: "credentials",
    emailVerifiedAt: new Date(),
  }).returning({ id: users.id });

  console.log("✓ Receptionist user created:");
  console.log("  Email: carolina.munoz@rasma.cl");
  console.log("  Password: Recepcion2024!");
  console.log(`  ID: ${receptionist.id}\n`);

  // 4. Create a supervisor user
  const supervisorPassword = await bcrypt.hash("Supervisor2024!", 12);
  const [supervisor] = await db.insert(users).values({
    name: "Dr. Roberto Silva",
    email: "roberto.silva@rasma.cl",
    passwordHash: supervisorPassword,
    role: "supervisor",
    active: true,
    authProvider: "credentials",
    emailVerifiedAt: new Date(),
  }).returning({ id: users.id });

  console.log("✓ Supervisor user created:");
  console.log("  Email: roberto.silva@rasma.cl");
  console.log("  Password: Supervisor2024!");
  console.log(`  ID: ${supervisor.id}\n`);

  // 5. Create sample patients
  const patientData = [
    {
      firstName: "Tomás",
      lastName: "Herrera Contreras",
      rut: "19.456.789-0",
      email: "tomas.herrera@email.cl",
      phone: "+56912345678",
      dateOfBirth: "2015-03-15",
      gender: "masculino" as const,
      address: "Av. Providencia 1234, Santiago",
      emergencyContactName: "Ana Contreras",
      emergencyContactPhone: "+56987654321",
      emergencyContactRelation: "Madre",
      insuranceProvider: "Fonasa",
      insuranceNumber: "FN-12345",
      referralSource: "Derivación neurólogo",
      notes: "Diagnóstico TEA nivel 1. Terapia ocupacional y fonoaudiología.",
      primaryTherapistId: therapist.id,
      status: "activo" as const,
    },
    {
      firstName: "Valentina",
      lastName: "López Rojas",
      rut: "20.123.456-7",
      email: "valentina.lopez@email.cl",
      phone: "+56911223344",
      dateOfBirth: "2018-07-22",
      gender: "femenino" as const,
      address: "Los Leones 567, Providencia",
      emergencyContactName: "Pedro López",
      emergencyContactPhone: "+56955667788",
      emergencyContactRelation: "Padre",
      insuranceProvider: "Isapre Colmena",
      insuranceNumber: "COL-67890",
      referralSource: "Pediatra tratante",
      notes: "TEA nivel 2, terapia conductual. Avance positivo en últimas sesiones.",
      primaryTherapistId: therapist.id,
      status: "activo" as const,
    },
    {
      firstName: "Matías",
      lastName: "Fernández Soto",
      rut: "18.789.012-3",
      email: "matias.fernandez@email.cl",
      phone: "+56933445566",
      dateOfBirth: "2012-11-08",
      gender: "masculino" as const,
      address: "Irarrázaval 890, Ñuñoa",
      emergencyContactName: "María Soto",
      emergencyContactPhone: "+56977889900",
      emergencyContactRelation: "Madre",
      insuranceProvider: "Fonasa",
      insuranceNumber: "FN-54321",
      referralSource: "Colegio",
      notes: "Evaluación inicial completada. Inicio tratamiento marzo 2024.",
      primaryTherapistId: therapist.id,
      status: "activo" as const,
    },
    {
      firstName: "Isidora",
      lastName: "Morales Vega",
      rut: "21.234.567-8",
      email: "isidora.morales@email.cl",
      phone: "+56944556677",
      dateOfBirth: "2019-01-30",
      gender: "femenino" as const,
      address: "Manuel Montt 456, Providencia",
      emergencyContactName: "Carlos Morales",
      emergencyContactPhone: "+56966778899",
      emergencyContactRelation: "Padre",
      insuranceProvider: "Isapre Cruz Blanca",
      insuranceNumber: "CB-11111",
      referralSource: "Recomendación familiar",
      notes: "Sospecha TEA, en proceso de evaluación diagnóstica.",
      primaryTherapistId: therapist.id,
      status: "activo" as const,
    },
    {
      firstName: "Sebastián",
      lastName: "Araya Pinto",
      rut: "17.654.321-K",
      email: "sebastian.araya@email.cl",
      phone: "+56955667788",
      dateOfBirth: "2010-05-14",
      gender: "masculino" as const,
      address: "Bilbao 123, Providencia",
      emergencyContactName: "Lucía Pinto",
      emergencyContactPhone: "+56988990011",
      emergencyContactRelation: "Madre",
      insuranceProvider: "Fonasa",
      insuranceNumber: "FN-99999",
      referralSource: "Hospital Roberto del Río",
      notes: "Alta terapéutica diciembre 2023. Controles cada 6 meses.",
      primaryTherapistId: therapist.id,
      status: "alta" as const,
    },
  ];

  for (const p of patientData) {
    const [patient] = await db.insert(patients).values(p).returning({ id: patients.id });

    // Create notification preferences for each patient
    await db.insert(notificationPreferences).values({
      patientId: patient.id,
      emailEnabled: true,
      whatsappEnabled: false,
      whatsappNumber: p.phone,
      reminderHoursBefore: 24,
    });

    console.log(`✓ Patient created: ${p.firstName} ${p.lastName} (${p.rut})`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Database seeded successfully!");
  console.log("=".repeat(60));
  console.log("\nUsers:");
  console.log("  Admin:        contacto@rasma.cl / Rasma2024!");
  console.log("  Terapeuta:    maria.gonzalez@rasma.cl / Terapeuta2024!");
  console.log("  Recepcionista: carolina.munoz@rasma.cl / Recepcion2024!");
  console.log("  Supervisor:   roberto.silva@rasma.cl / Supervisor2024!");
  console.log(`\nPatients: ${patientData.length} created`);
  console.log("\n⚠️  IMPORTANT: Change all passwords after first login!");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
