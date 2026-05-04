CREATE TABLE `api_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `cases` ADD `fullText` text;