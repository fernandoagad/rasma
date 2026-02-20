CREATE TABLE `foundation_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`drive_file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer,
	`drive_view_link` text,
	`drive_download_link` text,
	`category` text DEFAULT 'otro' NOT NULL,
	`label` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fdoc_category_idx` ON `foundation_documents` (`category`);--> statement-breakpoint
CREATE INDEX `fdoc_created_idx` ON `foundation_documents` (`created_at`);