import test from 'node:test';
import assert from 'node:assert/strict';
import {extractScanPage,pixelIds} from '../lib/offer-intel-scan-extract.mjs';
const page='https://brand.example/';
test('QA-R6-B04 regex literals and different identifiers do not install pixels',()=>{
  for(const source of [
    'const example = /gtag("config","G-AAAA1234")/;',
    'mygtag("config","G-AAAA1234");',
    '$gtag("config","G-AAAA1234");',
    'égtag("config","G-AAAA1234");',
    'const example = /[/]gtag("config","G-AAAA1234")/gi;',
    String.raw`const example = /a\/gtag("config","G-AAAA1234")/;`,
    'function example(){return /fbq("init","123456789")/;}',
  ]){
    assert.deepEqual(pixelIds(source,page),[],source);
    assert.deepEqual(extractScanPage(`<script>${source}</script>`,page).pixels,[],source);
  }
  assert.deepEqual(pixelIds('const ratio=10/2; gtag("config","G-REAL1234"); const other=ratio/2;',page).map(p=>p.id),['G-REAL1234']);
});
test('QA-R6-B04 comments and example strings are not installations, inline or external',()=>{
  const fixtures=[
    '// gtag("config","G-AAAA1234");\n/* fbq("init","123456789"); */',
    'const manual="Exemplo G-AAAA1234 sem instalação";',
    `const manual='fbq("init","123456789"); gtag("config","G-AAAA1234")';`,
    'const manual=`gtag("config","G-AAAA1234");`;',
    'const manual="GTM-EXAMPLE AW-123";',
    '/* unfinished gtag("config","G-AAAA1234");',
  ];
  for(const source of fixtures){
    assert.deepEqual(pixelIds(source,page),[],source);
    assert.deepEqual(extractScanPage(`<script>${source}</script>`,page).pixels,[],source);
  }
});
test('installed calls survive comments, URL literals and escaped quotes; Google src remains anchored',()=>{
  const source=String.raw`const example="url https://brand.example/ and escaped \" quote G-FAKE";
    // fbq('init','999');
    fbq(/* actual installation */'init','123456789');
    gtag('config','G-REAL1234');gtag('config','AW-123');
    (function(w,d,s,l,i){})(window,document,'script','dataLayer','GTM-REAL');
    (function(c,l,a,r,i,t,y){})(window,document,'clarity','script','project123');`;
  assert.deepEqual(pixelIds(source,page).map(p=>p.id),['123456789','G-REAL1234','GTM-REAL','AW-123','project123']);
  assert.deepEqual(extractScanPage(`<script>${source}</script>`,page).pixels,pixelIds(source,page));
  const html='<script src="https://www.googletagmanager.com/gtag/js?id=G-REAL1234"></script><script src="https://www.googletagmanager.com/gtm.js?id=GTM-REAL"></script><script src="https://googletagmanager.com.evil.example/gtm.js?id=GTM-FAKE"></script>';
  assert.deepEqual(extractScanPage(html,page).pixels.map(p=>p.id),['G-REAL1234','GTM-REAL']);
});
