-- AlterTable
ALTER TABLE "reels" ADD COLUMN "postId" TEXT;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
