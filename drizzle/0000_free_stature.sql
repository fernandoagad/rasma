CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`date_time` integer NOT NULL,
	`duration_minutes` integer DEFAULT 50 NOT NULL,
	`status` text DEFAULT 'programada' NOT NULL,
	`session_type` text DEFAULT 'individual' NOT NULL,
	`modality` text DEFAULT 'presencial' NOT NULL,
	`location` text,
	`meeting_link` text,
	`notes` text,
	`recurring_group_id` text,
	`recurring_rule` text,
	`price` integer,
	`google_event_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appt_patient_idx` ON `appointments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `appt_therapist_idx` ON `appointments` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `appt_datetime_idx` ON `appointments` (`date_time`);--> statement-breakpoint
CREATE INDEX `appt_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appt_recurring_idx` ON `appointments` (`recurring_group_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `care_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ctm_patient_idx` ON `care_team_members` (`patient_id`);--> statement-breakpoint
CREATE INDEX `ctm_user_idx` ON `care_team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `care_team_message_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`read_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `care_team_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ctmr_message_idx` ON `care_team_message_reads` (`message_id`);--> statement-breakpoint
CREATE INDEX `ctmr_user_idx` ON `care_team_message_reads` (`user_id`);--> statement-breakpoint
CREATE TABLE `care_team_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ctmsg_patient_idx` ON `care_team_messages` (`patient_id`);--> statement-breakpoint
CREATE INDEX `ctmsg_created_idx` ON `care_team_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `email_change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`new_email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ecr_user_idx` ON `email_change_requests` (`user_id`);--> statement-breakpoint
CREATE TABLE `google_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`scope` text,
	`token_type` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_tokens_user_id_unique` ON `google_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `gt_user_idx` ON `google_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `in_app_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`entity_type` text,
	`entity_id` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `in_app_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notif_read_idx` ON `in_app_notifications` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `notif_created_idx` ON `in_app_notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip_address` text,
	`success` integer NOT NULL,
	`attempted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `la_email_idx` ON `login_attempts` (`email`);--> statement-breakpoint
CREATE INDEX `la_attempted_idx` ON `login_attempts` (`attempted_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`email_enabled` integer DEFAULT true NOT NULL,
	`whatsapp_enabled` integer DEFAULT false NOT NULL,
	`whatsapp_number` text,
	`reminder_hours_before` integer DEFAULT 24 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_patient_id_unique` ON `notification_preferences` (`patient_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prt_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `patient_files` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`folder_id` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer,
	`drive_view_link` text,
	`drive_download_link` text,
	`category` text DEFAULT 'general' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `patient_folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pfile_patient_idx` ON `patient_files` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pfile_folder_idx` ON `patient_files` (`folder_id`);--> statement-breakpoint
CREATE INDEX `pfile_created_idx` ON `patient_files` (`created_at`);--> statement-breakpoint
CREATE TABLE `patient_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`drive_folder_id` text NOT NULL,
	`folder_name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_folders_patient_id_unique` ON `patient_folders` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pf_patient_idx` ON `patient_folders` (`patient_id`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`rut` text,
	`email` text,
	`phone` text,
	`date_of_birth` text,
	`gender` text,
	`address` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`emergency_contact_relation` text,
	`insurance_provider` text,
	`insurance_number` text,
	`referral_source` text,
	`notes` text,
	`clinical_profile` text,
	`program` text,
	`city` text,
	`primary_therapist_id` text,
	`status` text DEFAULT 'activo' NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`primary_therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `patients_status_idx` ON `patients` (`status`);--> statement-breakpoint
CREATE INDEX `patients_therapist_idx` ON `patients` (`primary_therapist_id`);--> statement-breakpoint
CREATE INDEX `patients_name_idx` ON `patients` (`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `patients_rut_idx` ON `patients` (`rut`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`appointment_id` text,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`payment_method` text,
	`date` text NOT NULL,
	`receipt_number` text,
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pay_patient_idx` ON `payments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pay_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `pay_date_idx` ON `payments` (`date`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`channel` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`sent` integer DEFAULT false NOT NULL,
	`sent_at` integer,
	`error` text,
	`external_message_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rem_appointment_idx` ON `reminders` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `rem_scheduled_idx` ON `reminders` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `rem_sent_idx` ON `reminders` (`sent`);--> statement-breakpoint
CREATE TABLE `session_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`encrypted_content` text NOT NULL,
	`content_iv` text NOT NULL,
	`content_tag` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sn_appointment_idx` ON `session_notes` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `sn_therapist_idx` ON `session_notes` (`therapist_id`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatment_plan_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`optional` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `treatment_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tpt_plan_idx` ON `treatment_plan_tasks` (`plan_id`);--> statement-breakpoint
CREATE TABLE `treatment_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`diagnosis` text,
	`goals` text,
	`interventions` text,
	`start_date` text NOT NULL,
	`next_review_date` text,
	`status` text DEFAULT 'activo' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tp_patient_idx` ON `treatment_plans` (`patient_id`);--> statement-breakpoint
CREATE INDEX `tp_therapist_idx` ON `treatment_plans` (`therapist_id`);--> statement-breakpoint
CREATE TABLE `user_presence` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_seen` integer NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` integer,
	`image` text,
	`password_hash` text,
	`role` text DEFAULT 'recepcionista' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`specialty` text,
	`area` text,
	`therapist_status` text,
	`attention_type` text,
	`auth_provider` text DEFAULT 'credentials' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);