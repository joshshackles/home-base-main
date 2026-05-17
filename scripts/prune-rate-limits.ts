import { pruneExpiredRateLimitBuckets } from "../src/lib/rate-limit";

async function main() {
  const result = await pruneExpiredRateLimitBuckets();
  console.log(`Pruned ${result.count} expired rate limit bucket(s).`);
}

main().catch((error) => {
  console.error("Failed to prune expired rate limit buckets", error);
  process.exit(1);
});
