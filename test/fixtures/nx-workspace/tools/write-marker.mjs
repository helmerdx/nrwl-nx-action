import { mkdir, writeFile } from 'node:fs/promises';

const project = process.argv[2];

await mkdir('.markers', { recursive: true });
await writeFile(`.markers/${project}`, 'ran');
