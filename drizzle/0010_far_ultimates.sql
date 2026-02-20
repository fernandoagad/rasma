CREATE TABLE `payout_items` (
	`id` text PRIMARY KEY NOT NULL,
	`payout_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`patient_type` text NOT NULL,
	`payment_amount` integer NOT NULL,
	`commission_rate` integer NOT NULL,
	`commission_amount` integer NOT NULL,
	FOREIGN KEY (`payout_id`) REFERENCES `therapist_payouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pi_payout_idx` ON `payout_items` (`payout_id`);--> statement-breakpoint
CREATE INDEX `pi_payment_idx` ON `payout_items` (`payment_id`);--> statement-breakpoint
CREATE TABLE `therapist_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bank_name` text NOT NULL,
	`account_type` text NOT NULL,
	`account_number` text NOT NULL,
	`holder_rut` text NOT NULL,
	`holder_name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `therapist_bank_accounts_user_id_unique` ON `therapist_bank_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `tba_user_idx` ON `therapist_bank_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `therapist_payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`therapist_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`payout_type` text NOT NULL,
	`gross_amount` integer NOT NULL,
	`commission_amount` integer NOT NULL,
	`deduction_amount` integer NOT NULL,
	`net_amount` integer NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`bank_transfer_ref` text,
	`paid_at` integer,
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payout_therapist_idx` ON `therapist_payouts` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `payout_status_idx` ON `therapist_payouts` (`status`);--> statement-breakpoint
CREATE INDEX `payout_period_idx` ON `therapist_payouts` (`period_start`);--> statement-breakpoint
ALTER TABLE `patients` ADD `type` text DEFAULT 'fundacion' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `mercadopago_preference_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `mercadopago_payment_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `mercadopago_status` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `checkout_url` text;