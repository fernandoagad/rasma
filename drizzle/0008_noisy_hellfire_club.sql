CREATE TABLE `intern_hours` (
	`id` text PRIMARY KEY NOT NULL,
	`intern_id` text NOT NULL,
	`date` text NOT NULL,
	`minutes` integer NOT NULL,
	`description` text NOT NULL,
	`logged_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`intern_id`) REFERENCES `interns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ihours_intern_idx` ON `intern_hours` (`intern_id`);--> statement-breakpoint
CREATE INDEX `ihours_date_idx` ON `intern_hours` (`date`);--> statement-breakpoint
CREATE TABLE `interns` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`university` text NOT NULL,
	`program` text NOT NULL,
	`supervisor_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`weekly_hours` integer DEFAULT 20 NOT NULL,
	`status` text DEFAULT 'activo' NOT NULL,
	`notes` text,
	`google_event_id` text,
	`meet_link` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interns_applicant_id_unique` ON `interns` (`applicant_id`);--> statement-breakpoint
CREATE INDEX `intern_status_idx` ON `interns` (`status`);--> statement-breakpoint
CREATE INDEX `intern_supervisor_idx` ON `interns` (`supervisor_id`);--> statement-breakpoint
CREATE INDEX `intern_applicant_idx` ON `interns` (`applicant_id`);