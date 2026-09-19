const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const distIndexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run vite build first.');
  process.exit(1);
}

// 1. Read dist/index.html and ensure that in compiled mode, it does NOT attempt to redirect to /docs/
let distIndexContent = fs.readFileSync(distIndexPath, 'utf8');

// Strip the root-only redirect from compiled dist/index.html
distIndexContent = distIndexContent.replace(
  /\/\* GITHUB_PAGES_ROOT_REDIRECT_START \*\/[\s\S]*?\/\* GITHUB_PAGES_ROOT_REDIRECT_END \*\//g,
  '/* Compiled bundle: running directly */'
);

fs.writeFileSync(distIndexPath, distIndexContent);

// 2. Ensure dist/.nojekyll exists
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// 3. Create the standardized GitHub Pages SPA 404.html in dist
const spa404Html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Ethiopian Roads Administration ERP</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // MIT License - https://github.com/rafgraph/spa-github-pages
      var l = window.location;
      var inDocs = l.pathname.includes('/docs/');
      var pathSegmentsToKeep = inDocs ? 2 : 1;
      
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
`;

fs.writeFileSync(path.join(distDir, '404.html'), spa404Html);

// 4. Sync dist completely to docs directory
if (fs.existsSync(docsDir)) {
  fs.rmSync(docsDir, { recursive: true, force: true });
}
fs.cpSync(distDir, docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
fs.writeFileSync(path.join(docsDir, '404.html'), spa404Html);

console.log('GitHub Pages assets successfully prepared in /dist and /docs');
