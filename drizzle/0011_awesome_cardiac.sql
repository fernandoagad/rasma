ALTER TABLE `payments` ADD `funding_source` text DEFAULT 'paciente' NOT NULL;--> statement-breakpoint
CREATE INDEX `pay_funding_idx` ON `payments` (`funding_source`);