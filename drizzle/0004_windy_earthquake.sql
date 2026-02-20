CREATE TABLE `direct_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`content` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dm_sender_idx` ON `direct_messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `dm_recipient_idx` ON `direct_messages` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `dm_created_idx` ON `direct_messages` (`created_at`);