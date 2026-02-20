DROP INDEX "afile_applicant_idx";--> statement-breakpoint
DROP INDEX "anote_applicant_idx";--> statement-breakpoint
DROP INDEX "anote_created_idx";--> statement-breakpoint
DROP INDEX "applicant_status_idx";--> statement-breakpoint
DROP INDEX "applicant_email_idx";--> statement-breakpoint
DROP INDEX "applicant_created_idx";--> statement-breakpoint
DROP INDEX "appt_patient_idx";--> statement-breakpoint
DROP INDEX "appt_therapist_idx";--> statement-breakpoint
DROP INDEX "appt_datetime_idx";--> statement-breakpoint
DROP INDEX "appt_status_idx";--> statement-breakpoint
DROP INDEX "appt_recurring_idx";--> statement-breakpoint
DROP INDEX "audit_user_idx";--> statement-breakpoint
DROP INDEX "audit_entity_idx";--> statement-breakpoint
DROP INDEX "audit_created_idx";--> statement-breakpoint
DROP INDEX "ctm_patient_idx";--> statement-breakpoint
DROP INDEX "ctm_user_idx";--> statement-breakpoint
DROP INDEX "ctmr_message_idx";--> statement-breakpoint
DROP INDEX "ctmr_user_idx";--> statement-breakpoint
DROP INDEX "ctmsg_patient_idx";--> statement-breakpoint
DROP INDEX "ctmsg_created_idx";--> statement-breakpoint
DROP INDEX "dm_sender_idx";--> statement-breakpoint
DROP INDEX "dm_recipient_idx";--> statement-breakpoint
DROP INDEX "dm_created_idx";--> statement-breakpoint
DROP INDEX "ecr_user_idx";--> statement-breakpoint
DROP INDEX "google_tokens_user_id_unique";--> statement-breakpoint
DROP INDEX "gt_user_idx";--> statement-breakpoint
DROP INDEX "notif_user_idx";--> statement-breakpoint
DROP INDEX "notif_read_idx";--> statement-breakpoint
DROP INDEX "notif_created_idx";--> statement-breakpoint
DROP INDEX "la_email_idx";--> statement-breakpoint
DROP INDEX "la_attempted_idx";--> statement-breakpoint
DROP INDEX "notification_preferences_patient_id_unique";--> statement-breakpoint
DROP INDEX "prt_user_idx";--> statement-breakpoint
DROP INDEX "pfile_patient_idx";--> statement-breakpoint
DROP INDEX "pfile_folder_idx";--> statement-breakpoint
DROP INDEX "pfile_created_idx";--> statement-breakpoint
DROP INDEX "patient_folders_patient_id_unique";--> statement-breakpoint
DROP INDEX "pf_patient_idx";--> statement-breakpoint
DROP INDEX "patients_status_idx";--> statement-breakpoint
DROP INDEX "patients_therapist_idx";--> statement-breakpoint
DROP INDEX "patients_name_idx";--> statement-breakpoint
DROP INDEX "patients_rut_idx";--> statement-breakpoint
DROP INDEX "pay_patient_idx";--> statement-breakpoint
DROP INDEX "pay_status_idx";--> statement-breakpoint
DROP INDEX "pay_date_idx";--> statement-breakpoint
DROP INDEX "perfeval_user_idx";--> statement-breakpoint
DROP INDEX "perfeval_period_idx";--> statement-breakpoint
DROP INDEX "poshist_user_idx";--> statement-breakpoint
DROP INDEX "rem_appointment_idx";--> statement-breakpoint
DROP INDEX "rem_scheduled_idx";--> statement-breakpoint
DROP INDEX "rem_sent_idx";--> statement-breakpoint
DROP INDEX "salhist_user_idx";--> statement-breakpoint
DROP INDEX "sn_appointment_idx";--> statement-breakpoint
DROP INDEX "sn_therapist_idx";--> statement-breakpoint
DROP INDEX "sbenefit_user_idx";--> statement-breakpoint
DROP INDEX "sbenefit_type_idx";--> statement-breakpoint
DROP INDEX "sdoc_user_idx";--> statement-breakpoint
DROP INDEX "sdoc_category_idx";--> statement-breakpoint
DROP INDEX "tpt_plan_idx";--> statement-breakpoint
DROP INDEX "tp_patient_idx";--> statement-breakpoint
DROP INDEX "tp_therapist_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "role" TO "role" text NOT NULL DEFAULT 'invitado';--> statement-breakpoint
CREATE INDEX `afile_applicant_idx` ON `applicant_files` (`applicant_id`);--> statement-breakpoint
CREATE INDEX `anote_applicant_idx` ON `applicant_notes` (`applicant_id`);--> statement-breakpoint
CREATE INDEX `anote_created_idx` ON `applicant_notes` (`created_at`);--> statement-breakpoint
CREATE INDEX `applicant_status_idx` ON `applicants` (`status`);--> statement-breakpoint
CREATE INDEX `applicant_email_idx` ON `applicants` (`email`);--> statement-breakpoint
CREATE INDEX `applicant_created_idx` ON `applicants` (`created_at`);--> statement-breakpoint
CREATE INDEX `appt_patient_idx` ON `appointments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `appt_therapist_idx` ON `appointments` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `appt_datetime_idx` ON `appointments` (`date_time`);--> statement-breakpoint
CREATE INDEX `appt_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appt_recurring_idx` ON `appointments` (`recurring_group_id`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `ctm_patient_idx` ON `care_team_members` (`patient_id`);--> statement-breakpoint
CREATE INDEX `ctm_user_idx` ON `care_team_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `ctmr_message_idx` ON `care_team_message_reads` (`message_id`);--> statement-breakpoint
CREATE INDEX `ctmr_user_idx` ON `care_team_message_reads` (`user_id`);--> statement-breakpoint
CREATE INDEX `ctmsg_patient_idx` ON `care_team_messages` (`patient_id`);--> statement-breakpoint
CREATE INDEX `ctmsg_created_idx` ON `care_team_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `dm_sender_idx` ON `direct_messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `dm_recipient_idx` ON `direct_messages` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `dm_created_idx` ON `direct_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `ecr_user_idx` ON `email_change_requests` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_tokens_user_id_unique` ON `google_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `gt_user_idx` ON `google_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `in_app_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notif_read_idx` ON `in_app_notifications` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `notif_created_idx` ON `in_app_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `la_email_idx` ON `login_attempts` (`email`);--> statement-breakpoint
CREATE INDEX `la_attempted_idx` ON `login_attempts` (`attempted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_patient_id_unique` ON `notification_preferences` (`patient_id`);--> statement-breakpoint
CREATE INDEX `prt_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `pfile_patient_idx` ON `patient_files` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pfile_folder_idx` ON `patient_files` (`folder_id`);--> statement-breakpoint
CREATE INDEX `pfile_created_idx` ON `patient_files` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_folders_patient_id_unique` ON `patient_folders` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pf_patient_idx` ON `patient_folders` (`patient_id`);--> statement-breakpoint
CREATE INDEX `patients_status_idx` ON `patients` (`status`);--> statement-breakpoint
CREATE INDEX `patients_therapist_idx` ON `patients` (`primary_therapist_id`);--> statement-breakpoint
CREATE INDEX `patients_name_idx` ON `patients` (`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `patients_rut_idx` ON `patients` (`rut`);--> statement-breakpoint
CREATE INDEX `pay_patient_idx` ON `payments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pay_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `pay_date_idx` ON `payments` (`date`);--> statement-breakpoint
CREATE INDEX `perfeval_user_idx` ON `performance_evaluations` (`user_id`);--> statement-breakpoint
CREATE INDEX `perfeval_period_idx` ON `performance_evaluations` (`period`);--> statement-breakpoint
CREATE INDEX `poshist_user_idx` ON `position_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `rem_appointment_idx` ON `reminders` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `rem_scheduled_idx` ON `reminders` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `rem_sent_idx` ON `reminders` (`sent`);--> statement-breakpoint
CREATE INDEX `salhist_user_idx` ON `salary_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `sn_appointment_idx` ON `session_notes` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `sn_therapist_idx` ON `session_notes` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `sbenefit_user_idx` ON `staff_benefits` (`user_id`);--> statement-breakpoint
CREATE INDEX `sbenefit_type_idx` ON `staff_benefits` (`type`);--> statement-breakpoint
CREATE INDEX `sdoc_user_idx` ON `staff_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `sdoc_category_idx` ON `staff_documents` (`category`);--> statement-breakpoint
CREATE INDEX `tpt_plan_idx` ON `treatment_plan_tasks` (`plan_id`);--> statement-breakpoint
CREATE INDEX `tp_patient_idx` ON `treatment_plans` (`patient_id`);--> statement-breakpoint
CREATE INDEX `tp_therapist_idx` ON `treatment_plans` (`therapist_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `users` ADD `linked_patient_id` text;