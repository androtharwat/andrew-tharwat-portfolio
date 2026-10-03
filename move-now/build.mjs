import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[join(root,'src/entry.tsx')],bundle:true,minify:true,jsx:'automatic',format:'esm',target:'es2022',outfile:join(root,'assets/app.js'),define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
