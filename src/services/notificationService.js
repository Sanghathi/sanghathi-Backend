import Notification from "../models/Notification.js";
import User from "../models/User.js";
import sendEmail from "../utils/email.js";
import logger from "../utils/logger.js";

class NotificationService {
  async createNotification(userId, title, description, type) {
    try {
      const notification = await Notification.create({
        userId,
        title,
        description,
        type,
        isUnread: true,
      });
      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error);
      return null;
    }
  }

  async sendNotificationEmail(userId, subject, message, html) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        logger.warn(`No user or email found for userId: ${userId}`);
        return null;
      }

      const emailResult = await sendEmail({
        email: user.email,
        subject,
        message,
        html,
      });

      return emailResult;
    } catch (error) {
      logger.error("Error sending notification email:", error);
      return null;
    }
  }

  async notifyUser(userId, title, description, type, emailSubject, emailMessage, emailHtml) {
    const results = {
      notification: null,
      email: null,
    };

    if (userId) {
      results.notification = await this.createNotification(userId, title, description, type);
    }

    if (emailSubject) {
      results.email = await this.sendNotificationEmail(userId, emailSubject, emailMessage, emailHtml);
    }

    return results;
  }

  async notifyMultipleUsers(userIds, title, description, type, emailSubject, emailMessage, emailHtml) {
    const results = await Promise.all(
      userIds.map((userId) =>
        this.notifyUser(userId, title, description, type, emailSubject, emailMessage, emailHtml)
      )
    );
    return results;
  }
}

export default new NotificationService();