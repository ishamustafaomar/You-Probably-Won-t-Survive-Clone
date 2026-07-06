#!/usr/bin/env python3
"""Deploy the YPWS clone to Vercel via the REST API (no CLI needed).

Usage: VERCEL_TOKEN=xxx python3 vercel_deploy.py
Creates/uses project 'you-probably-wont-survive' and a production deployment,
uploading files inline (base64) to POST /v13/deployments.
"""
import base64
import json
import os
import sys
import time
import urllib.request

REPO = '/home/user/You-Probably-Won-t-Survive-Clone'
NAME = 'you-probably-wont-survive'
TOKEN = os.environ.get('VERCEL_TOKEN', '').strip()
if not TOKEN:
    sys.exit('VERCEL_TOKEN is not set')

FILES = ['index.html', 'README.md',
         'assets/tilesheet.png', 'assets/KENNEY-LICENSE.txt'] + \
        ['src/' + f for f in os.listdir(os.path.join(REPO, 'src')) if f.endswith('.js')]


def api(path, payload=None, method=None):
    req = urllib.request.Request(
        'https://api.vercel.com' + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method or ('POST' if payload is not None else 'GET'),
        headers={'Authorization': 'Bearer ' + TOKEN,
                 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        sys.exit(f'API {path} failed: HTTP {e.code}\n{body[:800]}')


files = []
for rel in FILES:
    with open(os.path.join(REPO, rel), 'rb') as f:
        files.append({'file': rel,
                      'data': base64.b64encode(f.read()).decode(),
                      'encoding': 'base64'})
print(f'uploading {len(files)} files inline...')

dep = api('/v13/deployments?skipAutoDetectionConfirmation=1', {
    'name': NAME,
    'files': files,
    'target': 'production',
    'projectSettings': {'framework': None},
})
dep_id, url = dep['id'], dep['url']
print('deployment created:', dep_id, 'https://' + url)

for _ in range(60):
    st = api(f'/v13/deployments/{dep_id}')
    state = st.get('readyState') or st.get('status')
    print('state:', state)
    if state == 'READY':
        alias = st.get('alias') or []
        print('DEPLOYED: https://' + url)
        for a in alias:
            print('ALIAS: https://' + a)
        sys.exit(0)
    if state in ('ERROR', 'CANCELED'):
        sys.exit('deployment failed: ' + json.dumps(st)[:800])
    time.sleep(3)
sys.exit('timed out waiting for READY')
