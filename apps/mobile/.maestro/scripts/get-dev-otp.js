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

output.devCode = body.code;
