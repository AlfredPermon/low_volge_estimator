const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

content = content.replace(/\r\n/g, '\n');

const oldUser = `model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String   @default("OPERATIVO") // ADMINISTRADOR, SUPERVISOR, OPERATIVO, LECTURA
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  estimates    Estimate[]
  priceItems   PriceItem[]
  sessions     Session[]
}`;

const newUser = `model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("OPERATIVO") // ADMINISTRADOR, SUPERVISOR, OPERATIVO, LECTURA
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  estimates     Estimate[]
  priceItems    PriceItem[]
  sessions      Session[]
  accounts      Account[]
}`;

const oldSession = `model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
}`;

const newSession = `model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([token])
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}`;

if (content.includes(oldUser)) {
  content = content.replace(oldUser, newUser);
} else {
  console.log('oldUser pattern not found');
}

if (content.includes(oldSession)) {
  content = content.replace(oldSession, newSession);
} else {
  console.log('oldSession pattern not found');
}

fs.writeFileSync(schemaPath, content);
console.log('Schema updated successfully');
