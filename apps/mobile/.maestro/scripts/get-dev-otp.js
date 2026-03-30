// get-dev-otp.js
// Fetches the latest dev OTP from the API for the test phone number.
// The API must be running in dev mode (TELEGRAM_BOT_TOKEN="").
// Sets output.devCode for use in the Maestro flow.

var response = http.get('http://localhost:3000/api/v1/auth/dev/latest-otp?phone=%2B251911234567');

if (response.status !== 200) {
  throw new Error('Failed to fetch dev OTP: HTTP ' + response.status + ' — ' + response.body);
}

var body = JSON.parse(response.body);
if (!body.code) {
  throw new Error('No code in response: ' + response.body);
}

var code = body.code;
output.devCode = code;
// Individual digits for explicit per-box entry
output.d1 = code[0];
output.d2 = code[1];
output.d3 = code[2];
output.d4 = code[3];
output.d5 = code[4];
output.d6 = code[5];
