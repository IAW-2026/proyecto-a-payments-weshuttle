-- CreateTable
CREATE TABLE "ConnectionTest" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionTest_pkey" PRIMARY KEY ("id")
);
