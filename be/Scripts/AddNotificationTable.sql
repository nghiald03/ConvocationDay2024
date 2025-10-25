-- Add Notification table manually
-- Run this script directly on your database

-- Create Notification table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notification' AND xtype='U')
BEGIN
    CREATE TABLE [Notification] (
        [NotificationId] int NOT NULL IDENTITY(1,1),
        [Title] nvarchar(200) NOT NULL,
        [Content] nvarchar(1000) NOT NULL,
        [Priority] int NOT NULL DEFAULT 2,
        [HallId] int NULL,
        [SessionId] int NULL,
        [CreatedBy] varchar(10) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        [BroadcastBy] varchar(10) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
        [CreatedAt] datetime NOT NULL DEFAULT GETDATE(),
        [ScheduledAt] datetime NULL,
        [BroadcastAt] datetime NULL,
        [Status] nvarchar(20) NOT NULL DEFAULT 'PENDING',
        [IsAutomatic] bit NOT NULL DEFAULT 0,
        CONSTRAINT [PK_Notification] PRIMARY KEY ([NotificationId])
    );
END

-- Create indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Notification_HallId')
BEGIN
    CREATE INDEX [IX_Notification_HallId] ON [Notification] ([HallId]);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Notification_SessionId')
BEGIN
    CREATE INDEX [IX_Notification_SessionId] ON [Notification] ([SessionId]);
END

-- Add foreign key constraints
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name='FK_Notification_Hall_HallId')
BEGIN
    ALTER TABLE [Notification]
    ADD CONSTRAINT [FK_Notification_Hall_HallId]
    FOREIGN KEY ([HallId]) REFERENCES [Hall] ([HallId]) ON DELETE SET NULL;
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name='FK_Notification_Session_SessionId')
BEGIN
    ALTER TABLE [Notification]
    ADD CONSTRAINT [FK_Notification_Session_SessionId]
    FOREIGN KEY ([SessionId]) REFERENCES [Session] ([SessionId]) ON DELETE SET NULL;
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name='FK_Notification_Users_CreatedBy')
BEGIN
    ALTER TABLE [Notification]
    ADD CONSTRAINT [FK_Notification_Users_CreatedBy]
    FOREIGN KEY ([CreatedBy]) REFERENCES [Users] ([UserID]) ON DELETE NO ACTION;
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name='FK_Notification_Users_BroadcastBy')
BEGIN
    ALTER TABLE [Notification]
    ADD CONSTRAINT [FK_Notification_Users_BroadcastBy]
    FOREIGN KEY ([BroadcastBy]) REFERENCES [Users] ([UserID]) ON DELETE SET NULL;
END

-- Add NO role if not exists
IF NOT EXISTS (SELECT * FROM [Role] WHERE [RoleId] = '4')
BEGIN
    INSERT INTO [Role] ([RoleId], [RoleName]) VALUES ('4', 'NO');
END

-- Add Noticer user if not exists
IF NOT EXISTS (SELECT * FROM [Users] WHERE [UserID] = '4')
BEGIN
    INSERT INTO [Users] ([UserID], [FullName], [Email], [Password], [RoleID])
    VALUES ('4', 'Noticer', 'noticer@gmail.com', '123456', '4');
END

PRINT 'Notification system setup completed successfully!';