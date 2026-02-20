CREATE TABLE `applicant_files` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer,
	`drive_view_link` text,
	`drive_download_link` text,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `afile_applicant_idx` ON `applicant_files` (`applicant_id`);--> statement-breakpoint
CREATE TABLE `applicant_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'nota' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `anote_applicant_idx` ON `applicant_notes` (`applicant_id`);--> statement-breakpoint
CREATE INDEX `anote_created_idx` ON `applicant_notes` (`created_at`);--> statement-breakpoint
CREATE TABLE `applicants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`positions` text NOT NULL,
	`status` text DEFAULT 'nuevo' NOT NULL,
	`assigned_to` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `applicant_status_idx` ON `applicants` (`status`);--> statement-breakpoint
CREATE INDEX `applicant_email_idx` ON `applicants` (`email`);--> statement-breakpoint
CREATE INDEX `applicant_created_idx` ON `applicants` (`created_at`);--> statement-breakpoint
ALTER TABLE `patient_files` ADD `label` text;