CREATE TABLE `performance_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`evaluator_id` text NOT NULL,
	`period` text NOT NULL,
	`score` integer,
	`strengths` text,
	`areas_to_improve` text,
	`goals` text,
	`comments` text,
	`status` text DEFAULT 'borrador' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evaluator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `perfeval_user_idx` ON `performance_evaluations` (`user_id`);--> statement-breakpoint
CREATE INDEX `perfeval_period_idx` ON `performance_evaluations` (`period`);--> statement-breakpoint
CREATE TABLE `position_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`department` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `poshist_user_idx` ON `position_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `salary_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'CLP' NOT NULL,
	`effective_date` text NOT NULL,
	`reason` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `salhist_user_idx` ON `salary_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `staff_benefits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer,
	`start_date` text NOT NULL,
	`end_date` text,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sbenefit_user_idx` ON `staff_benefits` (`user_id`);--> statement-breakpoint
CREATE INDEX `sbenefit_type_idx` ON `staff_benefits` (`type`);--> statement-breakpoint
CREATE TABLE `staff_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer,
	`category` text DEFAULT 'otro' NOT NULL,
	`drive_view_link` text,
	`drive_download_link` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sdoc_user_idx` ON `staff_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `sdoc_category_idx` ON `staff_documents` (`category`);