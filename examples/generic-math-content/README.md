# Generic math content source

This directory is the Math Map-owned source for the checked-in assets under
`generated-math-content/`.

The initial manifest, Project Views, and review receipts were migrated once from the
frozen Gamma donor. Math Map now owns these product files; builds do not read Gamma.

Run `npm run build:generic-math-content` to regenerate the browser assets, or
`npm run build:generic-math-content -- --check` to verify that checked-in assets are
current without writing them.

