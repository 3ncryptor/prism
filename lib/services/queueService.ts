import { getDocumentProcessingQueue } from "@/lib/queue/queues";
import type { DocumentProcessingJobPayload } from "@/lib/queue/jobTypes";

export async function enqueueDocumentProcessing(
  payload: DocumentProcessingJobPayload,
): Promise<void> {
  await getDocumentProcessingQueue().add(payload.type, payload);
}
