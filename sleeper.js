// Netlify serverless function – proxies Sleeper API to avoid CORS
exports.handler = async (event) => {
  const path = event.queryStringParameters?.path || '';
  const url  = `https://api.sleeper.app/v1${path}`;

  try {
    const res  = await fetch(url);
    const data = await res.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
