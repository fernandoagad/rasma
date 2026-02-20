import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================================
// AUTH TABLES
// ============================================================

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    image: text("image"),
    passwordHash: text("password_hash"), // Nullable: Google OAuth users won't have one
    role: text("role", {
      enum: ["admin", "terapeuta", "recepcionista", "supervisor", "rrhh", "paciente", "invitado"],
    })
      .notNull()
      .default("invitado"),
    linkedPatientId: text("linked_patient_id"), // Links patient-role users to their patient record
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    specialty: text("specialty"), // "Psiquiatra Adulto", "Psicóloga Infantil", etc.
    area: text("area"), // "Clínica", "Salud Mental", "Neurodesarrollo", etc.
    therapistStatus: text("therapist_status", {
      enum: ["evaluando", "disponible", "completo"],
    }),
    attentionType: text("attention_type"), // "Diagnóstico Adulto", "Evaluación Infantil", etc.
    authProvider: text("auth_provider", {
      enum: ["credentials", "google"],
    })
      .notNull()
      .default("credentials"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

// Google OAuth tokens — stored for Calendar/Meet API access
export const googleTokens = sqliteTable(
  "google_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    tokenType: text("token_type"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("gt_user_idx").on(table.userId)]
);

// ============================================================
// SECURITY TABLES
// ============================================================

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("prt_user_idx").on(table.userId)]
);

export const emailChangeRequests = sqliteTable(
  "email_change_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newEmail: text("new_email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("ecr_user_idx").on(table.userId)]
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    success: integer("success", { mode: "boolean" }).notNull(),
    attemptedAt: integer("attempted_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("la_email_idx").on(table.email),
    index("la_attempted_idx").on(table.attemptedAt),
  ]
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(), // "create", "update", "delete", "view", "login", etc.
    entityType: text("entity_type").notNull(), // "patient", "appointment", "payment", etc.
    entityId: text("entity_id"),
    details: text("details"), // JSON string with additional context
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("audit_user_idx").on(table.userId),
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// PATIENTS
// ============================================================

export const patients = sqliteTable(
  "patients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    rut: text("rut"), // Chilean national ID
    email: text("email"),
    phone: text("phone"),
    dateOfBirth: text("date_of_birth"), // ISO "YYYY-MM-DD"
    gender: text("gender", {
      enum: ["masculino", "femenino", "otro", "no_especificado"],
    }),
    address: text("address"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),
    insuranceProvider: text("insurance_provider"),
    insuranceNumber: text("insurance_number"),
    referralSource: text("referral_source"),
    notes: text("notes"),
    clinicalProfile: text("clinical_profile"), // JSON: {strengths, objectives, familySupport, interests}
    program: text("program"), // "Colegio Santa Ana", etc.
    city: text("city"), // "Illapel", etc.
    primaryTherapistId: text("primary_therapist_id").references(
      () => users.id
    ),
    status: text("status", {
      enum: ["activo", "inactivo", "alta"],
    })
      .notNull()
      .default("activo"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("patients_status_idx").on(table.status),
    index("patients_therapist_idx").on(table.primaryTherapistId),
    index("patients_name_idx").on(table.lastName, table.firstName),
    index("patients_rut_idx").on(table.rut),
  ]
);

// ============================================================
// APPOINTMENTS
// ============================================================

export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => users.id),
    dateTime: integer("date_time", { mode: "timestamp" }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(50),
    status: text("status", {
      enum: ["programada", "completada", "cancelada", "no_asistio"],
    })
      .notNull()
      .default("programada"),
    sessionType: text("session_type", {
      enum: ["individual", "pareja", "familiar", "grupal", "evaluacion"],
    })
      .notNull()
      .default("individual"),
    modality: text("modality", {
      enum: ["presencial", "online"],
    })
      .notNull()
      .default("presencial"),
    location: text("location"),
    meetingLink: text("meeting_link"),
    notes: text("notes"),
    recurringGroupId: text("recurring_group_id"),
    recurringRule: text("recurring_rule"), // JSON RRULE-like pattern
    price: integer("price"), // Price in CLP (Chilean pesos), null = not set
    googleEventId: text("google_event_id"), // Linked Google Calendar event
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("appt_patient_idx").on(table.patientId),
    index("appt_therapist_idx").on(table.therapistId),
    index("appt_datetime_idx").on(table.dateTime),
    index("appt_status_idx").on(table.status),
    index("appt_recurring_idx").on(table.recurringGroupId),
  ]
);

// ============================================================
// SESSION NOTES (encrypted for privacy)
// ============================================================

export const sessionNotes = sqliteTable(
  "session_notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    appointmentId: text("appointment_id")
      .notNull()
      .references(() => appointments.id),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => users.id),
    encryptedContent: text("encrypted_content").notNull(), // AES-256-GCM encrypted JSON
    contentIv: text("content_iv").notNull(), // Initialization vector
    contentTag: text("content_tag").notNull(), // Auth tag
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("sn_appointment_idx").on(table.appointmentId),
    index("sn_therapist_idx").on(table.therapistId),
  ]
);

// ============================================================
// TREATMENT PLANS
// ============================================================

export const treatmentPlans = sqliteTable(
  "treatment_plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => users.id),
    diagnosis: text("diagnosis"),
    goals: text("goals"), // JSON array
    interventions: text("interventions"), // JSON array
    startDate: text("start_date").notNull(), // ISO date
    nextReviewDate: text("next_review_date"),
    status: text("status", {
      enum: ["activo", "completado", "suspendido"],
    })
      .notNull()
      .default("activo"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("tp_patient_idx").on(table.patientId),
    index("tp_therapist_idx").on(table.therapistId),
  ]
);

// ============================================================
// TREATMENT PLAN TASKS
// ============================================================

export const treatmentPlanTasks = sqliteTable(
  "treatment_plan_tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    planId: text("plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    optional: integer("optional", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("tpt_plan_idx").on(table.planId)]
);

// ============================================================
// PAYMENTS
// ============================================================

export const payments = sqliteTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    appointmentId: text("appointment_id").references(() => appointments.id),
    amount: integer("amount").notNull(), // Stored in cents
    status: text("status", {
      enum: ["pendiente", "pagado", "parcial", "cancelado"],
    })
      .notNull()
      .default("pendiente"),
    paymentMethod: text("payment_method", {
      enum: ["efectivo", "transferencia", "tarjeta", "otro"],
    }),
    date: text("date").notNull(), // ISO "YYYY-MM-DD"
    receiptNumber: text("receipt_number"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("pay_patient_idx").on(table.patientId),
    index("pay_status_idx").on(table.status),
    index("pay_date_idx").on(table.date),
  ]
);

// ============================================================
// EXPENSES (Gastos operativos)
// ============================================================

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    description: text("description").notNull(),
    amount: integer("amount").notNull(), // Stored in cents (CLP)
    category: text("category", {
      enum: [
        "arriendo",
        "servicios_basicos",
        "suministros",
        "mantenimiento",
        "seguros",
        "marketing",
        "software",
        "otros",
      ],
    }).notNull(),
    date: text("date").notNull(), // ISO "YYYY-MM-DD"
    receiptDriveFileId: text("receipt_drive_file_id"),
    receiptFileName: text("receipt_file_name"),
    receiptMimeType: text("receipt_mime_type"),
    receiptViewLink: text("receipt_view_link"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("exp_category_idx").on(table.category),
    index("exp_date_idx").on(table.date),
  ]
);

// ============================================================
// REMINDERS
// ============================================================

export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    appointmentId: text("appointment_id")
      .notNull()
      .references(() => appointments.id),
    channel: text("channel", { enum: ["email", "whatsapp"] }).notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
    sent: integer("sent", { mode: "boolean" }).notNull().default(false),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    error: text("error"),
    externalMessageId: text("external_message_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("rem_appointment_idx").on(table.appointmentId),
    index("rem_scheduled_idx").on(table.scheduledAt),
    index("rem_sent_idx").on(table.sent),
  ]
);

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .unique()
      .references(() => patients.id, { onDelete: "cascade" }),
    emailEnabled: integer("email_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    whatsappEnabled: integer("whatsapp_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    whatsappNumber: text("whatsapp_number"),
    reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  }
);

// ============================================================
// SYSTEM SETTINGS (key-value store for global config)
// ============================================================

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================
// RELATIONS
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  googleToken: one(googleTokens),
  linkedPatient: one(patients, {
    fields: [users.linkedPatientId],
    references: [patients.id],
  }),
  patients: many(patients),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
  treatmentPlans: many(treatmentPlans),
  inAppNotifications: many(inAppNotifications),
  presence: one(userPresence),
  careTeamMemberships: many(careTeamMembers),
  sentDMs: many(directMessages, { relationName: "dmSender" }),
  receivedDMs: many(directMessages, { relationName: "dmRecipient" }),
}));

export const googleTokensRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleTokens.userId],
    references: [users.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  primaryTherapist: one(users, {
    fields: [patients.primaryTherapistId],
    references: [users.id],
  }),
  appointments: many(appointments),
  payments: many(payments),
  treatmentPlans: many(treatmentPlans),
  notificationPreferences: one(notificationPreferences),
  careTeamMembers: many(careTeamMembers),
  careTeamMessages: many(careTeamMessages),
  folder: one(patientFolders),
  files: many(patientFiles),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.id],
    }),
    therapist: one(users, {
      fields: [appointments.therapistId],
      references: [users.id],
    }),
    sessionNote: one(sessionNotes),
    payment: one(payments, {
      fields: [appointments.id],
      references: [payments.appointmentId],
    }),
    reminders: many(reminders),
  })
);

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  appointment: one(appointments, {
    fields: [sessionNotes.appointmentId],
    references: [appointments.id],
  }),
  therapist: one(users, {
    fields: [sessionNotes.therapistId],
    references: [users.id],
  }),
}));

export const treatmentPlansRelations = relations(
  treatmentPlans,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [treatmentPlans.patientId],
      references: [patients.id],
    }),
    therapist: one(users, {
      fields: [treatmentPlans.therapistId],
      references: [users.id],
    }),
    tasks: many(treatmentPlanTasks),
  })
);

export const treatmentPlanTasksRelations = relations(
  treatmentPlanTasks,
  ({ one }) => ({
    plan: one(treatmentPlans, {
      fields: [treatmentPlanTasks.planId],
      references: [treatmentPlans.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  patient: one(patients, {
    fields: [payments.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  creator: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reminders.appointmentId],
    references: [appointments.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    patient: one(patients, {
      fields: [notificationPreferences.patientId],
      references: [patients.id],
    }),
  })
);

// ============================================================
// IN-APP NOTIFICATIONS
// ============================================================

export const inAppNotifications = sqliteTable(
  "in_app_notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "appointment_reminder", "new_message", "status_change", "payment_due", "system"
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    entityType: text("entity_type"), // "appointment", "patient", "message", etc.
    entityId: text("entity_id"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("notif_user_idx").on(table.userId),
    index("notif_read_idx").on(table.userId, table.read),
    index("notif_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// USER PRESENCE (for online status)
// ============================================================

export const userPresence = sqliteTable("user_presence", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastSeen: integer("last_seen", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  status: text("status", { enum: ["online", "away", "offline"] })
    .notNull()
    .default("online"),
});

// ============================================================
// CARE TEAMS (multi-specialist collaboration per patient)
// ============================================================

export const careTeamMembers = sqliteTable(
  "care_team_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "lead", "member", "consultant"
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("ctm_patient_idx").on(table.patientId),
    index("ctm_user_idx").on(table.userId),
  ]
);

// ============================================================
// CARE TEAM MESSAGES (per-patient team chat)
// ============================================================

export const careTeamMessages = sqliteTable(
  "care_team_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("ctmsg_patient_idx").on(table.patientId),
    index("ctmsg_created_idx").on(table.createdAt),
  ]
);

export const careTeamMessageReads = sqliteTable(
  "care_team_message_reads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: text("message_id")
      .notNull()
      .references(() => careTeamMessages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: integer("read_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("ctmr_message_idx").on(table.messageId),
    index("ctmr_user_idx").on(table.userId),
  ]
);

// ============================================================
// DIRECT MESSAGES (staff-to-staff DMs)
// ============================================================

export const directMessages = sqliteTable(
  "direct_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("dm_sender_idx").on(table.senderId),
    index("dm_recipient_idx").on(table.recipientId),
    index("dm_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// PATIENT FILES (Google Drive integration)
// ============================================================

export const patientFolders = sqliteTable(
  "patient_folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .unique()
      .references(() => patients.id, { onDelete: "cascade" }),
    driveFolderId: text("drive_folder_id").notNull(),
    folderName: text("folder_name").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("pf_patient_idx").on(table.patientId)]
);

export const patientFiles = sqliteTable(
  "patient_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    folderId: text("folder_id")
      .notNull()
      .references(() => patientFolders.id, { onDelete: "cascade" }),
    driveFileId: text("drive_file_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size"),
    driveViewLink: text("drive_view_link"),
    driveDownloadLink: text("drive_download_link"),
    category: text("category", {
      enum: ["general", "evaluacion", "informe", "consentimiento", "otro"],
    })
      .notNull()
      .default("general"),
    label: text("label"), // Free-text tag: "Informe TEA", "Evaluación Cognitiva", etc.
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("pfile_patient_idx").on(table.patientId),
    index("pfile_folder_idx").on(table.folderId),
    index("pfile_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// NEW TABLE RELATIONS
// ============================================================

export const inAppNotificationsRelations = relations(
  inAppNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [inAppNotifications.userId],
      references: [users.id],
    }),
  })
);

export const userPresenceRelations = relations(userPresence, ({ one }) => ({
  user: one(users, {
    fields: [userPresence.userId],
    references: [users.id],
  }),
}));

export const careTeamMembersRelations = relations(
  careTeamMembers,
  ({ one }) => ({
    patient: one(patients, {
      fields: [careTeamMembers.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [careTeamMembers.userId],
      references: [users.id],
    }),
  })
);

export const careTeamMessagesRelations = relations(
  careTeamMessages,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [careTeamMessages.patientId],
      references: [patients.id],
    }),
    sender: one(users, {
      fields: [careTeamMessages.senderId],
      references: [users.id],
    }),
    reads: many(careTeamMessageReads),
  })
);

export const careTeamMessageReadsRelations = relations(
  careTeamMessageReads,
  ({ one }) => ({
    message: one(careTeamMessages, {
      fields: [careTeamMessageReads.messageId],
      references: [careTeamMessages.id],
    }),
    user: one(users, {
      fields: [careTeamMessageReads.userId],
      references: [users.id],
    }),
  })
);

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: "dmSender",
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
    relationName: "dmRecipient",
  }),
}));

export const patientFoldersRelations = relations(patientFolders, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFolders.patientId],
    references: [patients.id],
  }),
  createdByUser: one(users, {
    fields: [patientFolders.createdBy],
    references: [users.id],
  }),
}));

export const patientFilesRelations = relations(patientFiles, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFiles.patientId],
    references: [patients.id],
  }),
  folder: one(patientFolders, {
    fields: [patientFiles.folderId],
    references: [patientFolders.id],
  }),
  uploader: one(users, {
    fields: [patientFiles.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================================
// APPLICANT TRACKING TABLES
// ============================================================

export const applicants = sqliteTable(
  "applicants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    positions: text("positions").notNull(), // JSON array: ["Psicólogo/a Infantil", ...]
    status: text("status", {
      enum: ["nuevo", "en_revision", "entrevista", "aceptado", "rechazado", "en_espera"],
    })
      .notNull()
      .default("nuevo"),
    assignedTo: text("assigned_to").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("applicant_status_idx").on(table.status),
    index("applicant_email_idx").on(table.email),
    index("applicant_created_idx").on(table.createdAt),
  ]
);

export const applicantFiles = sqliteTable(
  "applicant_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    driveFileId: text("drive_file_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size"),
    driveViewLink: text("drive_view_link"),
    driveDownloadLink: text("drive_download_link"),
    uploadedAt: integer("uploaded_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("afile_applicant_idx").on(table.applicantId)]
);

export const applicantNotes = sqliteTable(
  "applicant_notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    type: text("type", {
      enum: ["nota", "email_enviado", "estado_cambiado"],
    })
      .notNull()
      .default("nota"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("anote_applicant_idx").on(table.applicantId),
    index("anote_created_idx").on(table.createdAt),
  ]
);

// ============================================================
// STAFF MANAGEMENT TABLES (HR module)
// ============================================================

/** Documents stored per staff member (CV, contracts, certifications, etc.) */
export const staffDocuments = sqliteTable(
  "staff_documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    driveFileId: text("drive_file_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size"),
    category: text("category", {
      enum: ["cv", "contrato", "certificacion", "evaluacion", "otro"],
    })
      .notNull()
      .default("otro"),
    label: text("label"),
    driveViewLink: text("drive_view_link"),
    driveDownloadLink: text("drive_download_link"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("sdoc_user_idx").on(table.userId),
    index("sdoc_category_idx").on(table.category),
  ]
);

/** Position history per staff member */
export const positionHistory = sqliteTable(
  "position_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(), // "Psicóloga Infantil", "Coordinadora Clínica"
    department: text("department"), // "Clínica", "Administración"
    startDate: text("start_date").notNull(), // ISO date
    endDate: text("end_date"), // null = current
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("poshist_user_idx").on(table.userId),
  ]
);

/** Salary history per staff member */
export const salaryHistory = sqliteTable(
  "salary_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // Monthly gross in CLP
    currency: text("currency").notNull().default("CLP"),
    effectiveDate: text("effective_date").notNull(), // ISO date
    reason: text("reason"), // "Aumento anual", "Cambio de cargo"
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("salhist_user_idx").on(table.userId),
  ]
);

/** Performance evaluations */
export const performanceEvaluations = sqliteTable(
  "performance_evaluations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    evaluatorId: text("evaluator_id")
      .notNull()
      .references(() => users.id),
    period: text("period").notNull(), // "2025-Q4", "2026-Q1"
    score: integer("score"), // 1-5
    strengths: text("strengths"),
    areasToImprove: text("areas_to_improve"),
    goals: text("goals"),
    comments: text("comments"),
    status: text("status", {
      enum: ["borrador", "completada", "revisada"],
    })
      .notNull()
      .default("borrador"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("perfeval_user_idx").on(table.userId),
    index("perfeval_period_idx").on(table.period),
  ]
);

/** Staff benefits */
export const staffBenefits = sqliteTable(
  "staff_benefits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["salud", "transporte", "alimentacion", "capacitacion", "otro"],
    })
      .notNull(),
    description: text("description").notNull(),
    amount: integer("amount"), // CLP if applicable
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("sbenefit_user_idx").on(table.userId),
    index("sbenefit_type_idx").on(table.type),
  ]
);

// Staff management relations
export const staffDocumentsRelations = relations(staffDocuments, ({ one }) => ({
  user: one(users, { fields: [staffDocuments.userId], references: [users.id] }),
  uploader: one(users, { fields: [staffDocuments.uploadedBy], references: [users.id] }),
}));

export const positionHistoryRelations = relations(positionHistory, ({ one }) => ({
  user: one(users, { fields: [positionHistory.userId], references: [users.id] }),
}));

export const salaryHistoryRelations = relations(salaryHistory, ({ one }) => ({
  user: one(users, { fields: [salaryHistory.userId], references: [users.id] }),
}));

export const performanceEvaluationsRelations = relations(performanceEvaluations, ({ one }) => ({
  user: one(users, { fields: [performanceEvaluations.userId], references: [users.id] }),
  evaluator: one(users, { fields: [performanceEvaluations.evaluatorId], references: [users.id] }),
}));

export const staffBenefitsRelations = relations(staffBenefits, ({ one }) => ({
  user: one(users, { fields: [staffBenefits.userId], references: [users.id] }),
}));

// Applicant relations
export const applicantsRelations = relations(applicants, ({ many, one }) => ({
  files: many(applicantFiles),
  notes: many(applicantNotes),
  assignedUser: one(users, {
    fields: [applicants.assignedTo],
    references: [users.id],
  }),
}));

export const applicantFilesRelations = relations(applicantFiles, ({ one }) => ({
  applicant: one(applicants, {
    fields: [applicantFiles.applicantId],
    references: [applicants.id],
  }),
}));

export const applicantNotesRelations = relations(applicantNotes, ({ one }) => ({
  applicant: one(applicants, {
    fields: [applicantNotes.applicantId],
    references: [applicants.id],
  }),
  author: one(users, {
    fields: [applicantNotes.authorId],
    references: [users.id],
  }),
}));
