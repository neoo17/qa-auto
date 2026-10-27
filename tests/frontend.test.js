const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadApp() {
    const requests = [];
    const script = fs.readFileSync(path.join(__dirname, '../frontend/App.vue'), 'utf8')
        .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '');
    const context = vm.createContext({
        ref: value => ({value}), reactive: value => value, watch: () => {},
        computed: fn => ({get value() { return fn(); }}), nextTick: () => {},
        TextDecoder, URL,
        fetch: async (_url, options) => {
            const body = JSON.parse(options.body);
            requests.push(body);
            let delivered = false;
            const events = body.tests.map((_, stream) => `data: ${JSON.stringify({type:'end', stream})}\n\n`).join('');
            return {body:{getReader:()=>({read:async()=>{
                if (delivered) return {done:true};
                delivered=true; return {done:false,value:new TextEncoder().encode(events)};
            }})}};
        }
    });
    vm.runInContext(script + '\nglobalThis.app = {tests, globalConfig, addTest, runTest, runAll};', context);
    return {app:context.app, requests};
}

test('single run sends popup mode and finishes the selected card', async () => {
    const {app,requests}=loadApp();
    app.addTest();
    app.tests.value[1].url='https://example.invalid/';
    app.globalConfig.packagePopup='2';
    await app.runTest(1);
    assert.equal(requests[0].tests[0].custom.packagePopup,'2');
    assert.equal(app.tests.value[0].testEnded,false);
    assert.equal(app.tests.value[1].testEnded,true);
});

test('batch run preserves a per-test popup choice', async () => {
    const {app,requests}=loadApp();
    app.addTest();
    app.tests.value.forEach(t=>t.url='https://example.invalid/');
    app.globalConfig.packagePopup='1';
    app.tests.value[1].useCustomConfig=true;
    app.tests.value[1].packagePopup='skip';
    await app.runAll();
    assert.deepEqual(requests[0].tests.map(t=>t.custom.packagePopup),['1','skip']);
    assert.ok(app.tests.value.every(t=>t.testEnded && !t.loading));
});
