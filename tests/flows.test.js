const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const choosePackage = require('../backend/utils/chooseByCustomParam');
const chooseProduct = require('../backend/utils/chooseProductByCustomParam');
const checkState = require('../backend/utils/checkStateAjax');
const handleUpsales = require('../backend/utils/handleUpsales');
const { parseIsoRegions } = require('../backend/utils/checkSelectStateISOLookup');

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

test('CA-FR uses French headings, including merged headings and territories', () => {
    const html = `<table class="wikitable"><tbody>
      <tr><th rowspan="2">Code ISO 3166-2</th><th colspan="2">Province</th></tr>
      <tr><th>Nom anglais</th><th>Nom français</th></tr>
      <tr><td>CA-BC</td><td>British Columbia</td><td><a>Colombie-Britannique</a></td></tr>
      <tr><td>CA-QC</td><td>Quebec</td><td><a>Québec</a></td></tr></tbody></table>
      <table class="wikitable"><tbody><tr><th rowspan="2">Code</th><th colspan="2">Territoire</th></tr>
      <tr><th>Nom anglais</th><th>Nom français</th></tr>
      <tr><td>CA-NT</td><td>Northwest Territories</td><td><a>Territoires du Nord-Ouest</a></td></tr>
      </tbody></table>`;
    assert.deepEqual(parseIsoRegions(html, 'ca', 'fr').map(r => r.name),
        ['Colombie-Britannique', 'Québec', 'Territoires du Nord-Ouest']);
    assert.equal(parseIsoRegions(html, 'ca', 'en')[0].name, 'British Columbia');
    assert.deepEqual(parseIsoRegions(html.replaceAll('Nom français', 'Unknown'), 'ca', 'fr'), []);
});

test('other ISO tables retain code/name order handling', () => {
    const html = '<table class="wikitable"><tr><td><a>California</a></td><td>US-CA</td></tr></table>';
    assert.deepEqual(parseIsoRegions(html, 'us'), [{code:'CA',fullCode:'US-CA',name:'California'}]);
});

test('English ISO tables retain develop support for row headers', () => {
    for (const [country, code, name] of [['ca', 'BC', 'British Columbia'], ['us', 'CA', 'California']]) {
        const fullCode = `${country.toUpperCase()}-${code}`;
        const html = `<table class="wikitable sortable plainrowheaders"><tr>
          <th scope="row">${fullCode}</th><td><a>${name}</a><sup>[1]</sup></td>
        </tr></table>`;
        assert.deepEqual(parseIsoRegions(html, country, 'en'), [{code, fullCode, name}]);
    }
});

const products = [1, 2, 3].map((n) => ({sku:`product-${n}`,price:n * 10,quantity:6 - n}));
async function packagePage(t, { popup = true, closeOnly = false } = {}) {
    const page = await browser.newPage();
    t.after(() => page.close());
    const requests = [];
    await page.route('http://qa.test/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/order') {
            requests.push(route.request().postData());
            return route.fulfill({json:{success:true}});
        }
        if (url.pathname === '/ajax/state') return route.fulfill({json:{data:{products}}});
        if (url.pathname === '/shipping.html') return route.fulfill({contentType:'text/html',body:'<script>fetch("/ajax/state")</script><h1>Shipping</h1>'});
        return route.fulfill({contentType:'text/html',body:`
          <div class="packages">${[1,2,3].map(n=>`<div class="package package${n}" data-order-type="${n}">Package ${n}</div>`).join('')}</div>
          <div class="upgrade__wrapper" style="display:none">
            <button class="upgrade__close">Close</button>
            <div class="upgrade__packages_item package1 active">Bundle 1 <span class="price-hard">£10.00</span></div>
            <div class="upgrade__packages_item package2">Bundle 2 <span class="price-hard">£20.00</span></div>
            <a class="upgrade__yes_button package" data-order-type="1">Upgrade</a>
            ${closeOnly ? '' : '<a class="upgrade__no_button package">Keep package</a>'}
          </div>
          <script>
            const wrapper=document.querySelector('.upgrade__wrapper');
            let shown=false,original=1;
            async function order(n) { await fetch('/order',{method:'POST',body:'product=product-'+n}); location.href='/shipping.html'; }
            document.querySelectorAll('.packages .package').forEach(el=>el.onclick=()=>{
              original=Number(el.dataset.orderType);
              if (${popup} && original > 1 && !shown) {
                shown=true;wrapper.style.display='block';
                wrapper.querySelector('.package2').style.display=original===2?'none':'block';
              } else order(original);
            });
            wrapper.querySelectorAll('.upgrade__packages_item').forEach((el,i)=>el.onclick=()=>{
              wrapper.querySelectorAll('.upgrade__packages_item').forEach(x=>x.classList.remove('active'));
              el.classList.add('active');wrapper.querySelector('.upgrade__yes_button').dataset.orderType=i+1;
            });
            wrapper.querySelector('.upgrade__yes_button').onclick=e=>order(Number(e.currentTarget.dataset.orderType));
            const no=wrapper.querySelector('.upgrade__no_button');if(no)no.onclick=()=>order(original);
            wrapper.querySelector('.upgrade__close').onclick=()=>wrapper.style.display='none';
          </script>`});
    });
    await page.goto('http://qa.test/choose.html');
    return {page,requests};
}

for (const {original,mode,expected,popup,closeOnly} of [
    {original:1,mode:'skip',expected:1},
    {original:2,mode:'skip',expected:2},
    {original:3,mode:'skip',expected:3},
    {original:3,mode:'1',expected:1},
    {original:3,mode:'2',expected:2},
    {original:2,mode:'1',expected:1},
    {original:2,mode:'skip',expected:2,popup:false},
    {original:3,mode:'skip',expected:3,closeOnly:true}
]) {
    test(`package ${original}, popup ${mode}, legacy=${popup===false}, close=${!!closeOnly}`, async t => {
        const {page,requests}=await packagePage(t,{popup,closeOnly});
        const logs=[];
        const [state]=await Promise.all([
            checkState(page,()=>{}),
            choosePackage(page,m=>logs.push(m),{param:String(original),packagePopup:mode},()=>{},products)
        ]);
        assert.deepEqual(requests,[`product=product-${expected}`]);
        assert.deepEqual(state.data.products,products);
        assert.equal(logs.some(m=>m.startsWith('❌')),false,logs.join('\n'));
    });
}

test('unavailable popup choice fails without placing a different order', async t => {
    const {page,requests}=await packagePage(t);
    await assert.rejects(choosePackage(page,()=>{},{param:'2',packagePopup:'2'},()=>{},products),/нет доступного/);
    assert.deepEqual(requests,[]);
});

test('desktop product selection supports both single and batch custom parameters', async t => {
    const page=await browser.newPage();t.after(()=>page.close());
    await page.setContent(`<div class="product product1 active">One</div><div class="product product3">Three</div>
      <script>document.querySelectorAll('.product').forEach(el=>el.onclick=()=>{document.querySelectorAll('.product').forEach(x=>x.classList.remove('active'));el.classList.add('active')})</script>`);
    for (const custom of [{param:'3-1-0'},{customParam:'3-1-0'}]) {
        const result=await chooseProduct(page,()=>{},custom,()=>{},products);
        assert.equal(result.index,3);
        assert.equal(await page.locator('.product3').getAttribute('class'),'product product3 active');
    }
});

const physicalProducts = [
    {sku:'100',quantity:4,product_type:'Physical',templates:{title:'Upsell SleepWell Gummies 4 bottles pack'}},
    {sku:'101',quantity:2,product_type:'Physical',templates:{title:'Upsell SleepWell Gummies 2 bottles pack'}},
    {sku:'200',quantity:3,product_type:'Physical',templates:{title:'Upsell Physical combination pack'}}
];
async function upsalePage(t, { physical = true } = {}) {
    const page=await browser.newPage();t.after(()=>page.close());
    // Offer-specific history protection is covered by the live smoke runs.
    page.goBack=page.goForward=page.waitForTimeout=async()=>{};
    const catalog=physical?physicalProducts:[{sku:'100',quantity:1,templates:{title:'Upsell Legacy offer'}}];
    const data={upsales:catalog,profile:{product:{quantity:5}},templates:{title:'Main offer'}};
    const requests=[];
    await page.route('http://qa.test/**',async route=>{
        const req=route.request(), url=new URL(req.url());
        if (url.pathname==='/ajax/state') return route.fulfill({json:{data:{...data,marker:url.searchParams.has('old')?'old':'destination'}}});
        if (req.method()==='POST') {
            requests.push({path:url.pathname,body:req.postData()});
            return route.fulfill({json:{success:true}});
        }
        const second=url.pathname.includes('200');
        if(url.pathname==='/confirmation.html') return route.fulfill({contentType:'text/html',body:'<title>Main offer</title><script>fetch("/ajax/state")</script>Done'});
        const title=physical?(second?'Physical combination pack':'SleepWell Gummies bottles pack'):'Legacy offer';
        return route.fulfill({contentType:'text/html',body:`<title>${title}</title>
          <footer>Copyright ${new Date().getFullYear()}</footer>
          ${physical&&!second?'<div class="package" data-order-type="101">2 bottles</div><div class="package active" data-order-type="100">4 bottles</div>':''}
          <a class="button__yes">First YES</a><div class="button__yes">DIV YES</div><a class="button__yes">Last YES</a><a class="button__no">NO</a>
          <script>
            ${second?'fetch("/ajax/state");':''}
            document.querySelectorAll('.package').forEach(el=>el.onclick=()=>{document.querySelectorAll('.package').forEach(x=>x.classList.remove('active'));el.classList.add('active')});
            document.querySelectorAll('.button__yes,.button__no').forEach(el=>el.onclick=async()=>{
              const yes=el.classList.contains('button__yes');
              const sku=document.querySelector('.package.active')?.dataset.orderType||'${second?'200':'100'}';
              await fetch('/ajax/state?old=1').then(r=>r.json());
              await fetch(yes?'/ajax/add-upsale':'/ajax/skip-upsells',{method:'POST',body:'upsale%5B%5D='+sku+'&button='+encodeURIComponent(el.textContent)}).then(r=>r.json());
              location.href=${physical&&!second?'yes?"/confirmation.html":"/upsale-200.html"':'"/confirmation.html"'};
            });
          </script>`});
    });
    await page.goto('http://qa.test/upsale-100.html');
    return {page,requests,data};
}

for(const [schema,expected] of [
    ['1-2b-1',['101']],['1-4b-1',['100']],['1',['100']],
    ['1-0-1',['100','200']],['1-0-0',['100','200']],
    ['1-3',['100']],['1-2',['100']]
]) {
    test(`physical flow ${schema}: quantities are alternatives, destination state is fresh`,async t=>{
        const {page,requests,data}=await upsalePage(t);const logs=[];
        const state=await handleUpsales(page,m=>logs.push(m),{param:schema},()=>{},checkState,data,undefined,'hg');
        assert.deepEqual(requests.map(r=>new URLSearchParams(r.body).get('upsale[]')),expected);
        assert.match(page.url(),/confirmation/);
        assert.equal(state.data.marker,'destination');
        assert.equal(logs.filter(m=>m.includes('Год в футере корректный')).length, expected.length);
        assert.equal(logs.some(m=>m.startsWith('❌')),false,logs.join('\n'));
        if(schema==='1-0-1') assert.equal(requests[1].path,'/ajax/add-upsale');
        if(schema==='1-0-0') assert.equal(requests[1].path,'/ajax/skip-upsells');
    });
}

test('missing physical quantity stops before submitting',async t=>{
    const {page,requests,data}=await upsalePage(t);
    await assert.rejects(handleUpsales(page,()=>{},{param:'1-6b'},()=>{},checkState,data,undefined,'hg'),/нет варианта 6/);
    assert.deepEqual(requests,[]);
});

test('quantity tokens never silently become legacy DIV button actions',async t=>{
    const {page,requests,data}=await upsalePage(t,{physical:false});
    await assert.rejects(handleUpsales(page,()=>{},{param:'1-2b'},()=>{},checkState,data,undefined,'hg'),/Physical-флоу/);
    assert.deepEqual(requests,[]);
});

for(const [action,button] of [['1','First YES'],['2','DIV YES'],['3','Last YES'],['0','NO']]) {
    test(`legacy upsale action ${action} retains its button mapping`,async t=>{
        const {page,requests,data}=await upsalePage(t,{physical:false});
        // History protection belongs to the offer; keep this fixture focused on legacy selection.
        page.goBack=page.goForward=page.waitForTimeout=async()=>{};
        await handleUpsales(page,()=>{},{param:`1-${action}`},()=>{},checkState,data,undefined,'hg');
        assert.equal(requests.length,1);
        assert.equal(new URLSearchParams(requests[0].body).get('button'),button);
        assert.equal(requests[0].path,action==='0'?'/ajax/skip-upsells':'/ajax/add-upsale');
    });
}
