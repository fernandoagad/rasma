CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
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
CREATE INDEX `exp_category_idx` ON `expenses` (`category`);--> statement-breakpoint
CREATE INDEX `exp_date_idx` ON `expenses` (`date`);