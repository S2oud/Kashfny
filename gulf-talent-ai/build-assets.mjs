import {mkdir,copyFile} from 'node:fs/promises';
await mkdir(new URL('./.site-assets/app/',import.meta.url),{recursive:true});
for(const name of ['index.html','company-data.js','company-directory.js','company-groups.js','history.js','post-history.js','post-dates.js','post-relevance.js'])await copyFile(new URL(name,import.meta.url),new URL('./.site-assets/app/'+name,import.meta.url));
