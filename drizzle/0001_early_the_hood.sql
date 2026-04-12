CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL DEFAULT 1,
	`date` varchar(10) NOT NULL,
	`completionRate` int NOT NULL DEFAULT 0,
	`data` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentId` varchar(20) NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL DEFAULT 1,
	`area` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','in-progress','closed') NOT NULL DEFAULT 'open',
	`photoUrl` varchar(512),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`closedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`),
	CONSTRAINT `incidents_incidentId_unique` UNIQUE(`incidentId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL DEFAULT 1,
	`type` enum('critical_incident','work_order_assigned','checklist_reminder','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`relatedIncidentId` int,
	`relatedWorkOrderId` int,
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` varchar(20) NOT NULL,
	`createdByUserId` int NOT NULL,
	`assignedTechnicianId` int,
	`hotelId` int NOT NULL DEFAULT 1,
	`area` varchar(32) NOT NULL,
	`type` enum('preventive','corrective') NOT NULL,
	`description` text,
	`status` enum('open','in-progress','closed') NOT NULL DEFAULT 'open',
	`costEstimate` decimal(10,2),
	`costActual` decimal(10,2),
	`timeSpentMinutes` int,
	`notes` text,
	`signatureUrl` varchar(512),
	`date` varchar(10) NOT NULL,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `workOrders_workOrderId_unique` UNIQUE(`workOrderId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','technician','director') NOT NULL DEFAULT 'technician';--> statement-breakpoint
ALTER TABLE `users` ADD `hotelId` int DEFAULT 1 NOT NULL;