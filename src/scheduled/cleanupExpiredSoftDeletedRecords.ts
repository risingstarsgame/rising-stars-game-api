export async function cleanupExpiredSoftDeletedRecords(env: any) {
    const ttlDays = env.RECORD_SOFT_DELETE_TTL_DAYS || 10;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const cutoffStr = cutoff.toISOString();

    const result = await env.DB.prepare(
        `DELETE FROM records WHERE deleted = 1 AND deletion_date <= ?`
    ).bind(cutoffStr).run();

    console.log(`[Cron Trigger] Hard deleted ${result.changes} expired records (older than ${ttlDays} days)`);
    return result;
}