// Inline script to apply theme before hydration — avoids FOUC.
export default function ThemeScript() {
  const script = `
(function(){
  try {
    var t = localStorage.getItem('jurispurama-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
    var l = localStorage.getItem('jurispurama-lang');
    if (l === 'fr' || l === 'en' || l === 'es') {
      document.documentElement.setAttribute('lang', l);
    }
  } catch (e) {}
})();
`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
