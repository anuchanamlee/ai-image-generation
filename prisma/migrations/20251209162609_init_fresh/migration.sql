/*
  Warnings:

  - You are about to drop the `task_inputs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `key` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `master_prompt` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "task_inputs";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "master_prompt" TEXT NOT NULL,
    "image_count" INTEGER NOT NULL DEFAULT 1,
    "prompt_mode" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_tasks" ("created_at", "enabled", "id", "title", "updated_at") SELECT "created_at", "enabled", "id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
