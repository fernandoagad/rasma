CREATE TABLE `therapist_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`therapist_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`slot_duration_minutes` integer DEFAULT 50 NOT NULL,
	`modality` text DEFAULT 'ambos' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `avail_therapist_idx` ON `therapist_availability` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `avail_therapist_day_idx` ON `therapist_availability` (`therapist_id`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `therapist_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`therapist_id` text NOT NULL,
	`date` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exc_therapist_idx` ON `therapist_exceptions` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `exc_date_idx` ON `therapist_exceptions` (`therapist_id`,`date`);--> statement-breakpoint
CREATE INDEX `appt_datetime_status_idx` ON `appointments` (`date_time`,`status`);--> statement-breakpoint
CREATE INDEX `appt_patient_datetime_idx` ON `appointments` (`patient_id`,`date_time`);--> statement-breakpoint
CREATE INDEX `appt_therapist_patient_idx` ON `appointments` (`therapist_id`,`patient_id`);--> statement-breakpoint
CREATE INDEX `ctm_patient_user_idx` ON `care_team_members` (`patient_id`,`user_id`);