const assert=require('node:assert/strict');
require('./cat-roles.js');
const expected=['こつこつ猫','まもり猫','よりそい猫','みまもり猫','メカ猫','ものづくり猫','おもてなし猫','ごちそう猫','おとどけ猫','さきよみ猫','ひらめき猫','マイペース猫','まなび猫','おうち猫','ひとやすみ猫','きまま猫'];
assert.deepEqual(CatRoles.options.slice(1,-1).map(o=>CatRoles.label(o.id)),expected);
assert.equal(new Set(CatRoles.options.map(o=>o.id)).size,18);
for(const id of [null,undefined,'private','unknown'])assert.equal(CatRoles.label(id),'');
console.log('PASS cat roles: all 16 exact mappings, unset/private/unknown hidden, unique choices.');
