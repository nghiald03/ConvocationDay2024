create table dbo.Hall (
  HallId int not null primary key,
  HallName nvarchar(100) not null
);

create table dbo.[Session] (
  SessionId int not null primary key,
  [Session] int null,
  SessionInDay int null,
  [Description] nvarchar(max) null
);

create table dbo.CheckIn (
  CheckinID int not null primary key,
  HallId int null,
  SessionId int null,
  [Status] bit null
);

create table dbo.Bachelor (
  Id int not null primary key,
  StudentCode nvarchar(20) not null,
  FullName nvarchar(100) not null,
  Mail nvarchar(100) null,
  Faculty nvarchar(50) null,
  Major nvarchar(50) null,
  [Image] nvarchar(250) null,
  [Status] bit null,
  StatusBaChelor nvarchar(50) null,
  HallId int null,
  SessionId int null,
  Chair nvarchar(50) null,
  ChairParent nvarchar(50) null,
  SessionInDay int null,
  CheckIn bit null,
  TimeCheckIn datetime null,
  AttendanceStatus int not null
);

create table dbo.LegacyUsers (
  UserId nvarchar(450) not null primary key,
  FullName nvarchar(100) null,
  Email nvarchar(256) null,
  [Password] nvarchar(max) null,
  RoleId nvarchar(50) null
);

create table dbo.AspNetUsers (
  Id nvarchar(450) not null primary key,
  UserName nvarchar(256) null,
  NormalizedUserName nvarchar(256) null,
  Email nvarchar(256) null,
  NormalizedEmail nvarchar(256) null,
  EmailConfirmed bit not null,
  PasswordHash nvarchar(max) null,
  FullName nvarchar(100) null,
  LegacyUserId nvarchar(450) null,
  PasswordResetRequired bit not null
);

create table dbo.AspNetRoles (
  Id nvarchar(450) not null primary key,
  [Name] nvarchar(256) null,
  NormalizedName nvarchar(256) null
);

create table dbo.AspNetUserRoles (
  UserId nvarchar(450) not null,
  RoleId nvarchar(450) not null,
  primary key (UserId, RoleId)
);

create table dbo.Notification (
  NotificationId int not null primary key,
  Title nvarchar(200) not null,
  Content nvarchar(1000) not null,
  Priority int not null,
  HallId int null,
  SessionId int null,
  CreatedBy nvarchar(450) not null,
  BroadcastBy nvarchar(450) null,
  CreatedAt datetime not null,
  ScheduledAt datetime null,
  BroadcastAt datetime null,
  [Status] nvarchar(20) not null,
  IsAutomatic bit not null,
  RepeatCount int not null
);

create table dbo.MediaAssets (
  Id uniqueidentifier not null primary key,
  ObjectKey nvarchar(512) not null,
  OriginalName nvarchar(255) not null,
  ContentType nvarchar(100) not null,
  Size bigint not null,
  Width int null,
  Height int null,
  Sha256 nvarchar(64) not null,
  OwnerType nvarchar(50) not null,
  OwnerId nvarchar(100) not null,
  [Status] int not null,
  UploadedBy nvarchar(450) not null,
  CreatedAt datetimeoffset not null,
  DeletedAt datetimeoffset null
);

create table dbo.LegacyMediaMappings (
  Id bigint not null primary key,
  OldPath nvarchar(1024) not null,
  MediaId uniqueidentifier not null,
  Sha256 nvarchar(64) not null,
  MigratedAt datetimeoffset not null
);

create table dbo.AuditEvents (
  Id bigint not null primary key,
  [Action] nvarchar(100) not null,
  ActorId nvarchar(450) not null,
  TargetType nvarchar(100) not null,
  TargetId nvarchar(450) not null,
  Details nvarchar(2000) null,
  CreatedAt datetimeoffset not null
);

insert dbo.Hall (HallId, HallName) values (1, N'Hội trường A'), (2, N'Hội trường B');
insert dbo.[Session] (SessionId, [Session], SessionInDay, [Description]) values (10, 101, 1, N'Buổi sáng'), (20, 202, 2, N'Buổi chiều');
insert dbo.CheckIn (CheckinID, HallId, SessionId, [Status]) values (100, 1, 10, 1), (200, 2, 20, 0);
insert dbo.Bachelor (Id, StudentCode, FullName, Mail, Faculty, Major, [Image], [Status], StatusBaChelor, HallId, SessionId, Chair, ChairParent, SessionInDay, CheckIn, TimeCheckIn, AttendanceStatus)
values
  (1000, N'SE0001', N'Nguyễn Văn A', N'a@example.com', N'Công nghệ thông tin', N'Kỹ thuật phần mềm', N'/legacy/a.jpg', 1, N'Đủ điều kiện', 1, 10, N'1', N'10', 1, 1, '2026-08-31T08:00:00', 1),
  (2000, N'SE0002', N'Trần Thị B', N'b@example.com', N'Kinh tế', N'Quản trị', null, 1, N'Đủ điều kiện', 2, 20, N'2', N'20', 2, 0, null, 0);

insert dbo.LegacyUsers (UserId, FullName, Email, [Password], RoleId)
values (N'legacy-1', N'Quản trị viên', N'admin@example.com', null, N'MN');

insert dbo.AspNetRoles (Id, [Name], NormalizedName) values (N'role-mn', N'MN', N'MN');
insert dbo.AspNetUsers (Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed, PasswordHash, FullName, LegacyUserId, PasswordResetRequired)
values (N'asp-1', N'admin@example.com', N'ADMIN@EXAMPLE.COM', N'admin@example.com', N'ADMIN@EXAMPLE.COM', 1, @passwordHash, N'Quản trị viên', N'legacy-1', 0);
insert dbo.AspNetUserRoles (UserId, RoleId) values (N'asp-1', N'role-mn');

insert dbo.Notification (NotificationId, Title, Content, Priority, HallId, SessionId, CreatedBy, BroadcastBy, CreatedAt, ScheduledAt, BroadcastAt, [Status], IsAutomatic, RepeatCount)
values (300, N'Mời di chuyển', N'Tân cử nhân chuẩn bị lên sân khấu', 1, 1, 10, N'legacy-1', N'legacy-1', '2026-08-31T08:30:00', null, '2026-08-31T08:35:00', N'COMPLETED', 0, 2);

insert dbo.MediaAssets (Id, ObjectKey, OriginalName, ContentType, Size, Width, Height, Sha256, OwnerType, OwnerId, [Status], UploadedBy, CreatedAt, DeletedAt)
values ('11111111-1111-4111-a111-111111111111', N'legacy/a.webp', N'a.webp', N'image/webp', 128, 100, 100, replicate('a', 64), N'bachelor', N'SE0001', 0, N'asp-1', '2026-08-31T01:00:00+00:00', null);
insert dbo.LegacyMediaMappings (Id, OldPath, MediaId, Sha256, MigratedAt)
values (400, N'/legacy/a.jpg', '11111111-1111-4111-a111-111111111111', replicate('a', 64), '2026-08-31T01:05:00+00:00');
insert dbo.AuditEvents (Id, [Action], ActorId, TargetType, TargetId, Details, CreatedAt)
values (500, N'POST /api/Bachelor/Add', N'asp-1', N'bachelor', N'SE0001', N'{"source":"fixture"}', '2026-08-31T01:10:00+00:00');
