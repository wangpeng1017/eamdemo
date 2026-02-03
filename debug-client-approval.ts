
import * as fs from 'fs';
import * as path from 'path';
// import { prisma } from './src/lib/prisma'; // Removed static import
import { filterViewableApprovals } from './src/lib/approval/permission';

const USER_NAME = '秦兴国';
const FLOW_CODE = 'client_approval';

// Manual .env loading
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && !line.startsWith('#')) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('Loaded .env manually');
    }
} catch (e) {
    console.log('Failed to load .env', e);
}

async function main() {
    const { prisma } = await import('./src/lib/prisma');
    console.log('--- Debugging Client Approval Visibility ---');

    // 1. Get User Info
    const user = await prisma.user.findFirst({
        where: { name: USER_NAME },
        include: { roles: true }
    });

    if (!user) {
        console.error(`User ${USER_NAME} not found!`);
        // List all users to see if name is slightly different
        const allUsers = await prisma.user.findMany({ select: { name: true, id: true } });
        console.log('Available users:', allUsers.map(u => u.name).join(', '));
        return;
    }
    console.log(`User found: ${user.name} (${user.id})`);
    console.log('Roles:', user.roles.map(r => r.code).join(', '));

    // 2. Check Flow Configuration
    const flow = await prisma.approvalFlowConfig.findUnique({
        where: { code: FLOW_CODE }
    });
    console.log(`Flow Config (${FLOW_CODE}):`, flow ? 'Found' : 'Not Found');
    if (flow) {
        console.log('Flow Nodes:', flow.nodes);
    }

    // 3. Find Pending Client Approval Instances
    // @ts-ignore
    const instances = await prisma.approvalInstance.findMany({
        where: {
            flowCode: FLOW_CODE,
            status: 'pending'
        },
        include: {
            // @ts-ignore - Relation might be named differently or TS not picking it up
            approvalFlow: true
        }
    });

    console.log(`Found ${instances.length} pending instances for ${FLOW_CODE}`);

    for (const instance of instances) {
        console.log(`\nChecking Instance: ${instance.id} (BizId: ${instance.bizId})`);
        console.log(`Current Step: ${instance.currentStep}`);

        // Check visibility
        const canView = await filterViewableApprovals([instance as any], user);
        console.log(`Visible to ${USER_NAME}? ${canView.length > 0 ? 'YES' : 'NO'}`);

        // Simulate node matching logic manually to see why it fails
        // @ts-ignore
        if (instance.approvalFlow) {
            // @ts-ignore
            const nodesJson = instance.approvalFlow.nodes;
            const flowNodes = typeof nodesJson === 'string' ? JSON.parse(nodesJson) : nodesJson;
            // @ts-ignore
            const currentNodes = flowNodes.filter((n: any) => (n.step || n.order) === instance.currentStep);
            console.log('Current Step Nodes Config:', JSON.stringify(currentNodes, null, 2));

            // Check against user roles
            const userRoleCodes = user.roles.map(r => r.code);
            // @ts-ignore
            const match = currentNodes.some(node => {
                if (node.approverType === 'role') {
                    const hasRole = userRoleCodes.includes(node.approverRole);
                    console.log(`  Role Check: Need ${node.approverRole}, Have [${userRoleCodes.join(', ')}] -> ${hasRole}`);
                    return hasRole;
                } else if (node.approverType === 'specific_user') {
                    // @ts-ignore
                    const isUser = node.approverId === user.id;
                    // @ts-ignore
                    console.log(`  User Check: Need ${node.approverId}, Is ${user.id} -> ${isUser}`);
                    return isUser;
                }
                return false;
            });
            console.log(`  Node Match Result: ${match}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
