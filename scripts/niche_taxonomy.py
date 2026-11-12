"""Shared catalog, mirrored deterministic classifier; parity tested against JS."""
import json,re,unicodedata
from pathlib import Path
CATALOG=json.loads((Path(__file__).resolve().parent.parent/'lib/niche-catalog.json').read_text())
VERSION=CATALOG['version']
GROUPS=CATALOG['groups']
TOPICS={g['name']:{t['name']:t['terms'] for t in g['topics']} for g in GROUPS}
NICHES={g['name']:{'queries':list(dict.fromkeys(q for t in g['topics'] for q in t['queries'])), 'topics':TOPICS[g['name']]} for g in GROUPS}
def normalize(value):
 return re.sub('[^a-z0-9]+',' ',''.join(c for c in unicodedata.normalize('NFD',str(value or '')) if unicodedata.category(c)!='Mn').lower()).strip()
def has(text,term):return ' '+normalize(term)+' ' in ' '+normalize(text)+' '
def classify(text):
 pet=any(has(text,t) for t in CATALOG['petTerms']);matches=[]
 passages=[]
 for s in re.split(r'[.!?\n]+',str(text or '')):passages.extend(re.findall(r'.{1,500}(?:\s|$)',s) or [s] if len(s)>500 else [s])
 for g in GROUPS:
  if (g['name']=='Pet')!=pet:continue
  for t in g['topics']:
   score=0
   for index,p in enumerate(passages):
    terms=[term for term in t['terms'] if has(p,term) and any(has(p,c) and not has(term,c) for c in CATALOG['contextTerms'])]
    if terms:score=max(score,max(len(normalize(term).split()) for term in terms)*10+len(terms)+(0 if t['name']=='Geral' else 2)+(6 if index==0 else 0))
   if score:matches.append({'nicho':g['name'],'subnicho':t['name'],'score':score})
 return sorted(matches,key=lambda m:-m['score'])[0] if matches else None
