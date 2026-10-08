const { hashPassword } = require('better-auth/crypto');

async function main() {
  const hash = await hashPassword('AdminPassword123!');
  console.log('BETTER_AUTH_HASH=' + hash);
}

main();
