"""Package the browser-only demo into one file for free static HTML hosts."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
built = root / 'dist-preview'
html = (built / 'index.html').read_text()
def script(match):
    path = built / match.group(1).removeprefix('./')
    content = path.read_text().replace('</script', '<\\/script')
    return '<script type="module">' + content + '</script>'
def style(match):
    path = built / match.group(1).removeprefix('./')
    return '<style>' + path.read_text() + '</style>'
html = re.sub(r'<script[^>]*src="([^"]+)"[^>]*></script>', script, html)
html = re.sub(r'<link[^>]*href="([^"]+\.css)"[^>]*>', style, html)
html = html.replace('<title>Atlas · 海外公司服务</title>', '<title>Atlas · 免费交互演示</title>')
output = root / 'preview' / 'index.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html)
print(f'Standalone interactive demo created: {output} ({output.stat().st_size} bytes)')
