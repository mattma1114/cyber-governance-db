CREATE TABLE `admin_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`note` text,
	`createdBy` int NOT NULL,
	`usedBy` int,
	`usedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `case_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`file_key` varchar(512) NOT NULL,
	`file_url` text NOT NULL,
	`file_size` int,
	`mime_type` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(256),
	`group` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `cases` MODIFY COLUMN `status` enum('published','draft','unpublished') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `cases` ADD `full_text` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','frozen') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` DROP COLUMN `fullText`;