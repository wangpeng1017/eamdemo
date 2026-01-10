
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Manually load .env
try {
    const envPath = path.resolve(__dirname, '../.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log('Could not load .env file manually:', e.message);
}

const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany();
    users.forEach(u => {
        console.log(`[User] ID: ${u.id}, Username: ${u.username}, Name: ${u.name}, Roles: ${JSON.stringify(u.roles)}`);
    });

    console.log('\n--- APPROVAL INSTANCES (Last 5) ---');
    const instances = await prisma.approvalInstance.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            quotation: { select: { quotationNo: true } }
        }
    });

    instances.forEach(i => {
        console.log(`[Inst] ID: ${i.id}`);
        console.log(`       Biz: ${i.bizType} ${i.bizId} (${i.quotation?.quotationNo})`);
        console.log(`       SubmitterID: "${i.submitterId}"`);
        console.log(`       SubmitterName: "${i.submitterName}"`);
        console.log(`       Status: ${i.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
