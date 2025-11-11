import { Injectable, Logger } from '@nestjs/common';

interface PendingEventNotificationPayload {
  guardianId: string;
  minorId: string;
  eventId: string;
  eventTitle: string;
  eventStartAt: Date;
}

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly projectId = process.env.FIREBASE_PROJECT_ID;
  private readonly clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  private readonly privateKey = process.env.FIREBASE_PRIVATE_KEY;
  private readonly useMocks = process.env.USE_API_MOCKS === 'true';

  private get isConfigured() {
    return Boolean(this.projectId && this.clientEmail && this.privateKey);
  }

  async notifyGuardianPendingEvent(payload: PendingEventNotificationPayload): Promise<void> {
    if (this.useMocks || !this.isConfigured) {
      this.logger.debug(
        `Mock Firebase notification for guardian ${payload.guardianId} about event ${payload.eventId}`,
      );
      return;
    }

    // TODO: Integrate Firebase Admin SDK when credentials are available.
    this.logger.log(
      `Would send Firebase notification to guardian ${payload.guardianId} for event ${payload.eventId}`,
    );
  }
}
