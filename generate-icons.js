const sharp = require('sharp');

async function main() {
    try {
        console.log('Reading public/logo.jpg...');
        
        await sharp('public/logo.jpg')
            .resize(192, 192)
            .toFile('public/logo-192.png');
        console.log('Created logo-192.png');

        await sharp('public/logo.jpg')
            .resize(512, 512)
            .toFile('public/logo-512.png');
        console.log('Created logo-512.png');

        await sharp('public/logo.jpg')
            .resize(144, 144)
            .toFile('public/logo-144.png');
        console.log('Created logo-144.png');

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
