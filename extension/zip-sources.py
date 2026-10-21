# Source zip for Firefox AMO review: extension/ + the shared ../widget/ code + LICENSE (wxt zip only packs extension/).
# Run from the repository root: python extension/zip-sources.py
import json, os, zipfile

version = json.load(open('extension/package.json'))['version']
out = f'extension/.output/superduperbundle-extension-{version}-sources.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for base in ('extension', 'widget'):
        for d, ds, fs in os.walk(base):
            ds[:] = [x for x in ds if x not in ('node_modules', '.output', '.wxt', 'store-assets')]
            for f in fs:
                p = os.path.join(d, f)
                z.write(p, p.replace(os.sep, '/'))
    z.write('LICENSE', 'LICENSE')
print(out, len(zipfile.ZipFile(out).namelist()), 'files')
