CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('judicial','regulatory','legislation') NOT NULL,
	`title` varchar(512) NOT NULL,
	`titleEn` varchar(512),
	`topicId` varchar(64) NOT NULL,
	`jurisdictionId` varchar(64) NOT NULL,
	`date` varchar(32) NOT NULL,
	`source` varchar(256),
	`sourceUrl` text,
	`abstract` text,
	`aiSummary` text,
	`aiAnalysis` text,
	`tags` json DEFAULT ('[]'),
	`language` varchar(8) DEFAULT 'zh',
	`status` enum('published','draft') NOT NULL DEFAULT 'draft',
	`views` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisdictions` (
	`id` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`labelEn` varchar(128),
	`flag` varchar(16),
	`color` varchar(64),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisdictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`company` varchar(256),
	`jurisdiction` json DEFAULT ('[]'),
	`founded` int,
	`hq` varchar(256),
	`color` varchar(64),
	`abbr` varchar(8),
	`description` text,
	`portrait` json,
	`rules` json DEFAULT ('[]'),
	`timeline` json DEFAULT ('[]'),
	`relatedCaseIds` json DEFAULT ('[]'),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`labelEn` varchar(128),
	`desc` text,
	`color` varchar(64),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
