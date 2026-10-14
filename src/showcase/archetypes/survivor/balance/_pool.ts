/**
 * Shared probe fixture, not runnable on its own: fans a probe's jobs over child processes.
 * A take is an independent engine session, and sessions cannot share a process (module
 * context, persistence namespace, the global RNG), so a seed batch runs one child per core.
 * Each child takes a chunk of the jobs, so a child's start-up is paid once per core, not
 * once per take.
 *
 * The probe script is its own child: `runPool` re-invokes it with the chunk in an env var,
 * and `claimChunk` returns that chunk in the child, which prints one `RESULT <json>` line
 * per job.
 *
 * TODO(expansion): a parallel session pool for probe scripts (candidate-primitives.md
 * § Parallel session pool). This chunks jobs per worker, where frontier spawns per job.
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const ENV_KEY = 'SURVIVOR_PROBE_CHUNK';

/** The jobs this process was spawned to run, or null in the parent. */
export function claimChunk<Job>(): Job[] | null {
  const raw = process.env[ENV_KEY];
  return raw ? (JSON.parse(raw) as Job[]) : null;
}

/** A child's output for one job: the line the parent parses. */
export function emitResult(result: unknown): void {
  console.log(`RESULT ${JSON.stringify(result)}`);
}

/**
 * Runs the jobs across child processes and returns their results in job order.
 *
 * @param scriptUrl - The probe's `import.meta.url`; the pool re-invokes the probe.
 * @param jobs - Serializable job descriptions.
 * @param concurrency - Children at once; defaults to the cores less one.
 */
export async function runPool<Job, Result>(
  scriptUrl: string,
  jobs: Job[],
  concurrency = Math.max(1, cpus().length - 1),
): Promise<Result[]> {
  const workers = Math.min(concurrency, jobs.length);
  const chunks: { index: number; job: Job }[][] = Array.from({ length: workers }, () => []);
  jobs.forEach((job, index) => chunks[index % workers]!.push({ index, job }));
  const results: Result[] = new Array(jobs.length);
  const self = fileURLToPath(scriptUrl);
  // The parent runs under vite-node: argv[0] is node and argv[1] the vite-node CLI.
  const [node, cli] = process.argv as [string, string];

  await Promise.all(
    chunks.map(async (chunk) => {
      const child = spawn(node, [cli, self], {
        env: { ...process.env, [ENV_KEY]: JSON.stringify(chunk.map((c) => c.job)) },
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      let stdout = '';
      child.stdout.on('data', (b: Buffer) => (stdout += b.toString()));
      const code = await new Promise<number>((resolve) =>
        (child as unknown as EventEmitter).on('close', (c: number | null) => resolve(c ?? 0)),
      );
      const lines = stdout.split('\n').filter((l) => l.startsWith('RESULT '));
      if (code !== 0 || lines.length !== chunk.length)
        throw new Error(`survivor probe chunk failed, exit ${code}:\n${stdout.slice(-2000)}`);
      lines.forEach((l, i) => {
        results[chunk[i]!.index] = JSON.parse(l.slice('RESULT '.length)) as Result;
      });
    }),
  );
  return results;
}
