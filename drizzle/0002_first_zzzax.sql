CREATE TABLE `api_settings` (
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(256),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_settings_key` PRIMARY KEY(`key`)
);
