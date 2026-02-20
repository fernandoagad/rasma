CREATE TABLE `income` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`donor_name` text,
	`reference_number` text,
	`date` text NOT NULL,
	`receipt_drive_file_id` text,
	`receipt_file_name` text,
	`receipt_mime_type` text,
	`receipt_view_link` text,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inc_category_idx` ON `income` (`category`);--> statement-breakpoint
CREATE INDEX `inc_date_idx` ON `income` (`date`);