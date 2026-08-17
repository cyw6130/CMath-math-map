const APP_PATH = '/plugins/cmath-math-map/'

/** Embed the repository's existing Math Map v5 application unchanged. */
export function MathMapWorkspace() {
  return <iframe
    src={APP_PATH}
    title="CMath Math Map"
    style={{ width: '100%', height: '100%', minHeight: 720, border: 0, display: 'block', background: '#f4f0e8' }}
    allow="clipboard-read; clipboard-write"
  />
}
