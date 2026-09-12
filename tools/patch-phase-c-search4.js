const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'public/js/modules/05-playback/07-search.js');
let t = fs.readFileSync(p, 'utf8');
const oldFn = `function activeSearchProvidersForMode(mode) {
  var specific = searchModeProvider(mode);
  if (specific) return searchProviderCanSearch(specific) ? [specific] : [];
  return MUSIC_SEARCH_PROVIDER_ORDER.filter(searchProviderCanSearch);
}`;
const newFn = `function activeSearchProvidersForMode(mode) {
  var specific = searchModeProvider(mode);
  if (specific) return searchProviderCanSearch(specific) ? [specific] : [];
  var order = MUSIC_SEARCH_PROVIDER_ORDER.filter(searchProviderCanSearch);
  var liteOn = !!(typeof kugouLiteLoginStatus !== 'undefined' && kugouLiteLoginStatus && kugouLiteLoginStatus.loggedIn);
  var activeLite = (typeof activeAccountProvider !== 'undefined' && activeAccountProvider === 'kugou-lite');
  if (liteOn || activeLite) order = order.filter(function (p) { return p !== 'kugou'; });
  else order = order.filter(function (p) { return p !== 'kugou-lite'; });
  return order;
}`;
if (!t.includes(oldFn)) throw new Error('activeSearchProvidersForMode missing');
t = t.replace(oldFn, newFn);
fs.writeFileSync(p, t, 'utf8');
console.log('activeSearchProvidersForMode updated');
