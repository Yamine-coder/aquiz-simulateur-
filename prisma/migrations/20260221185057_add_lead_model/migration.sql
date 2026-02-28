-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "budget" REAL,
    "scoreFaisabilite" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'simulation',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
