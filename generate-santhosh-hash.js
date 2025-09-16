const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = 'Santhu@123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password:', password);
        console.log('Bcrypt Hash:', hash);
        console.log('\nSQL Update Command:');
        console.log(`UPDATE "public"."users" SET password_hash = '${hash}' WHERE email = 'santhosh@dmhca.in';`);
    } catch (error) {
        console.error('Error:', error);
    }
}

hashPassword();