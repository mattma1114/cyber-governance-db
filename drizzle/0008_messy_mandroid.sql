CREATE TABLE `platform_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform_id` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'policy',
	`url` text,
	`date` varchar(32),
	`full_text` longtext,
	`version_label` varchar(128),
	`version_date` varchar(32),
	`parent_rule_id` int,
	`is_latest` boolean NOT NULL DEFAULT true,
	`new_version_hint` text,
	`new_version_checked_at` timestamp,
	`sort_order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rule_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_id` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`file_key` varchar(512) NOT NULL,
	`file_url` text NOT NULL,
	`file_size` int,
	`mime_type` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rule_attachments_id` PRIMARY KEY(`id`)
);
