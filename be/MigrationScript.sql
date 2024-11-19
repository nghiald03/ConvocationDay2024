IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Hall] (
    [HallId] int NOT NULL IDENTITY,
    [HallName] nvarchar(100) NULL,
    CONSTRAINT [PK_Hall] PRIMARY KEY ([HallId])
);
GO

CREATE TABLE [Roles] (
    [RoleID] varchar(2) NOT NULL,
    [RoleName] nvarchar(10) NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY ([RoleID])
);
GO

CREATE TABLE [Session] (
    [SessionId] int NOT NULL IDENTITY,
    [Session] int NULL,
    CONSTRAINT [PK_Session] PRIMARY KEY ([SessionId])
);
GO

CREATE TABLE [Users] (
    [UserID] varchar(10) NOT NULL,
    [FullName] nvarchar(100) NULL,
    [Email] varchar(100) NULL,
    [Password] nvarchar(20) NULL,
    [RoleID] varchar(2) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([UserID]),
    CONSTRAINT [FK__Users__RoleID__49C3F6B7] FOREIGN KEY ([RoleID]) REFERENCES [Roles] ([RoleID])
);
GO

CREATE TABLE [Bachelor] (
    [Id] int NOT NULL IDENTITY,
    [StudentCode] varchar(20) NOT NULL,
    [FullName] nvarchar(100) NOT NULL,
    [Mail] varchar(100) NULL,
    [Faculty] varchar(50) NULL,
    [Major] varchar(50) NULL,
    [Image] varchar(250) NULL,
    [Status] bit NULL DEFAULT (((0))),
    [StatusBaChelor] varchar(50) NULL,
    [HallId] int NULL,
    [SessionId] int NULL,
    [Chair] varchar(50) NULL,
    [ChairParent] varchar(50) NULL,
    [CheckIn] bit NULL,
    [TimeCheckIn] datetime NULL,
    CONSTRAINT [PK_Bachelor] PRIMARY KEY ([Id]),
    CONSTRAINT [FK__Bachelor__HallId__403A8C7D] FOREIGN KEY ([HallId]) REFERENCES [Hall] ([HallId]),
    CONSTRAINT [FK__Bachelor__Sessio__412EB0B6] FOREIGN KEY ([SessionId]) REFERENCES [Session] ([SessionId])
);
GO

CREATE TABLE [CheckIn] (
    [CheckinID] int NOT NULL IDENTITY,
    [HallId] int NULL,
    [SessionId] int NULL,
    [Status] bit NULL,
    CONSTRAINT [PK_CheckIn] PRIMARY KEY ([CheckinID]),
    CONSTRAINT [FK__CheckIn__HallId__440B1D61] FOREIGN KEY ([HallId]) REFERENCES [Hall] ([HallId]),
    CONSTRAINT [FK__CheckIn__Session__44FF419A] FOREIGN KEY ([SessionId]) REFERENCES [Session] ([SessionId])
);
GO

CREATE INDEX [IX_Bachelor_HallId] ON [Bachelor] ([HallId]);
GO

CREATE INDEX [IX_Bachelor_SessionId] ON [Bachelor] ([SessionId]);
GO

CREATE INDEX [IX_CheckIn_HallId] ON [CheckIn] ([HallId]);
GO

CREATE INDEX [IX_CheckIn_SessionId] ON [CheckIn] ([SessionId]);
GO

CREATE INDEX [IX_Users_RoleID] ON [Users] ([RoleID]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241118162134_init', N'7.0.13');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'RoleID', N'RoleName') AND [object_id] = OBJECT_ID(N'[Roles]'))
    SET IDENTITY_INSERT [Roles] ON;
INSERT INTO [Roles] ([RoleID], [RoleName])
VALUES ('1', N'MN'),
('2', N'CK'),
('3', N'US');
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'RoleID', N'RoleName') AND [object_id] = OBJECT_ID(N'[Roles]'))
    SET IDENTITY_INSERT [Roles] OFF;
GO

IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'UserID', N'Email', N'FullName', N'Password', N'RoleID') AND [object_id] = OBJECT_ID(N'[Users]'))
    SET IDENTITY_INSERT [Users] ON;
INSERT INTO [Users] ([UserID], [Email], [FullName], [Password], [RoleID])
VALUES ('1', 'mana@gmail.com', N'Mana', N'123456', '1'),
('2', 'checkin@gmail.com', N'CheckIn', N'123456', '2'),
('3', 'user@gmail.com', N'User', N'123456', '3');
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'UserID', N'Email', N'FullName', N'Password', N'RoleID') AND [object_id] = OBJECT_ID(N'[Users]'))
    SET IDENTITY_INSERT [Users] OFF;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20241118163831_update', N'7.0.13');
GO

COMMIT;
GO

