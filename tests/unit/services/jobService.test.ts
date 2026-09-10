import {
  setListingStatus,
  setLeaderboardSize,
  JobNotFoundError,
  InvalidLeaderboardSizeError,
} from "@/lib/services/jobService";
import type { Job } from "@/lib/schemas/job";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    _id: "job-1",
    title: "Backend Engineer",
    fileKey: "jobs/job-1/original.pdf",
    createdBy: "admin-1",
    status: "READY",
    archived: false,
    publishedMatchRunId: null,
    publishedAt: null,
    listingStatus: "DRAFT",
    leaderboardSize: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("setListingStatus", () => {
  it("throws JobNotFoundError when the job doesn't exist", async () => {
    const deps = { jobs: { get: jest.fn().mockResolvedValue(null), setListingStatus: jest.fn(), setLeaderboardSize: jest.fn() } };
    await expect(setListingStatus("missing", "LIVE", deps)).rejects.toThrow(JobNotFoundError);
  });

  it("flips Draft to Live and returns the updated job", async () => {
    const deps = {
      jobs: {
        get: jest
          .fn()
          .mockResolvedValueOnce(makeJob({ listingStatus: "DRAFT" }))
          .mockResolvedValueOnce(makeJob({ listingStatus: "LIVE" })),
        setListingStatus: jest.fn().mockResolvedValue(undefined),
        setLeaderboardSize: jest.fn(),
      },
    };

    const result = await setListingStatus("job-1", "LIVE", deps);

    expect(deps.jobs.setListingStatus).toHaveBeenCalledWith("job-1", "LIVE");
    expect(result.listingStatus).toBe("LIVE");
  });
});

describe("setLeaderboardSize", () => {
  it("throws InvalidLeaderboardSizeError for a non-positive size", async () => {
    const deps = { jobs: { get: jest.fn(), setListingStatus: jest.fn(), setLeaderboardSize: jest.fn() } };
    await expect(setLeaderboardSize("job-1", 0, deps)).rejects.toThrow(InvalidLeaderboardSizeError);
    await expect(setLeaderboardSize("job-1", -5, deps)).rejects.toThrow(InvalidLeaderboardSizeError);
  });

  it("throws InvalidLeaderboardSizeError for a non-integer size", async () => {
    const deps = { jobs: { get: jest.fn(), setListingStatus: jest.fn(), setLeaderboardSize: jest.fn() } };
    await expect(setLeaderboardSize("job-1", 10.5, deps)).rejects.toThrow(InvalidLeaderboardSizeError);
  });

  it("throws JobNotFoundError when the job doesn't exist", async () => {
    const deps = { jobs: { get: jest.fn().mockResolvedValue(null), setListingStatus: jest.fn(), setLeaderboardSize: jest.fn() } };
    await expect(setLeaderboardSize("missing", 25, deps)).rejects.toThrow(JobNotFoundError);
  });

  it("updates the leaderboard size and returns the updated job", async () => {
    const deps = {
      jobs: {
        get: jest
          .fn()
          .mockResolvedValueOnce(makeJob({ leaderboardSize: 10 }))
          .mockResolvedValueOnce(makeJob({ leaderboardSize: 25 })),
        setListingStatus: jest.fn(),
        setLeaderboardSize: jest.fn().mockResolvedValue(undefined),
      },
    };

    const result = await setLeaderboardSize("job-1", 25, deps);

    expect(deps.jobs.setLeaderboardSize).toHaveBeenCalledWith("job-1", 25);
    expect(result.leaderboardSize).toBe(25);
  });
});
