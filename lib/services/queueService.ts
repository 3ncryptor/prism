import { getDocumentProcessingQueue, getMatchingQueue } from "@/lib/queue/queues";
import type { DocumentProcessingJobPayload, MatchingJobPayload } from "@/lib/queue/jobTypes";

export async function enqueueDocumentProcessing(
  payload: DocumentProcessingJobPayload,
): Promise<void> {
  await getDocumentProcessingQueue().add(payload.type, payload);
}

export async function enqueueMatchJob(payload: MatchingJobPayload): Promise<void> {
  await getMatchingQueue().add(payload.type, payload);
}
