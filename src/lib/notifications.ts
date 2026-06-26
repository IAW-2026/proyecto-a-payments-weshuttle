import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { NotificationRole } from "@prisma/client";
import { AppRole } from "@/lib/clerk-roles";

export type CreateNotificationInput = {
  type: string;
  title: string;
  message: string;
  userId: string;
  role?: NotificationRole;
};

export async function logNotification(input: CreateNotificationInput) {
  try {
    const user = await currentUser();
    let actorUserId = "system";
    let actorName = "Sistema";
    let actorRole: NotificationRole | null = null;

    if (user) {
      actorUserId = user.id;
      if (user.firstName || user.lastName) {
        actorName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
      } else if (user.username) {
        actorName = user.username;
      } else if (user.emailAddresses && user.emailAddresses.length > 0) {
        actorName = user.emailAddresses[0].emailAddress;
      }

      const roleStr = user.publicMetadata?.role as AppRole | undefined;
      if (roleStr === "rider") actorRole = "RIDER";
      else if (roleStr === "driver") actorRole = "DRIVER";
      else if (roleStr === "admin") actorRole = "ADMIN";
    }

    return await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        userId: input.userId,
        role: input.role ?? null,
        actorUserId,
        actorName,
        actorRole,
      },
    });
  } catch (error) {
    console.error("Error creating persistent notification:", error);
    return null;
  }
}

export async function getNotifications(limit = 50) {
  try {
    return await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}
