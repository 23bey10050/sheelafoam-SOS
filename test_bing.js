async function testBing() {
  const url = `https://api.keywordtool.io/v2/search/volume/bing`;
  const apikey = '21aab48709ba571c8938b203b2d2a98565fe8e3b';
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey,
        keyword: ['test'],
        metrics_currency: 'USD',
        output: 'json'
      })
    });
    console.log('[Bing Test] Status:', res.status);
    console.log(await res.text());
  } catch (err) { console.error(err.message); }
}

testBing();
