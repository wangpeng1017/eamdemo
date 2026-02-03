
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { filterViewableApprovals } from '@/lib/approval/permission';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userName = searchParams.get('userName');
    const flowCode = searchParams.get('flowCode');

    if (!userName || !flowCode) {
        return NextResponse.json({ error: 'Missing userName or flowCode' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { name: userName },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: `User ${userName} not found` }, { status: 404 });
        }

        const instances = await prisma.approvalInstance.findMany({
            where: {
                flowCode: flowCode,
                status: 'pending'
            }
        });

        const flowConfig = await prisma.approvalFlow.findUnique({
            where: { code: flowCode }
        });

        const analysis = [];

        for (const instance of instances) {
            // Use the actual permission logic
            // Note: filterViewableApprovals might rely on instance.approvalFlow if it expects it populated.
            // Let's check if we need to manually populate it or if filterViewableApprovals fetches it.
            // Looking at permission.ts, it often expects instance.approvalFlow to be present if it parses nodes from it.
            // If permission.ts expects it, we must mock it or fix schema.

            // Let's try to pass it manually attached
            const instanceWithFlow = { ...instance, approvalFlow: flowConfig };
            const viewable = await filterViewableApprovals([instanceWithFlow as any], user);

            // Analyze why
            let reason = 'Unknown';
            let flowNodes = [];
            if (flowConfig && flowConfig.nodes) {
                try {
                    flowNodes = typeof flowConfig.nodes === 'string'
                        ? JSON.parse(flowConfig.nodes)
                        : flowConfig.nodes;
                } catch (e) {
                    flowNodes = [];
                }
            }

            const currentStepNodes = flowNodes.filter((n: any) => (n.step || n.order) === instance.currentStep);

            analysis.push({
                instanceId: instance.id,
                bizId: instance.bizId,
                currentStep: instance.currentStep,
                isVisible: viewable.length > 0,
                currentUserRoles: user.roles.map(r => r.role.code || r.roleId),
                stepConfig: currentStepNodes,
                matchLog: currentStepNodes.map((node: any) => {
                    if (node.approverType === 'role') {
                        return `Role match: ${user.roles.some(r => r.role.code === node.approverRole || r.roleId === node.approverRole)}`;
                    }
                    if (node.approverType === 'specific_user') {
                        return `User match: ${node.approverId === user.id}`;
                    }
                    return 'Other type';
                })
            });
        }

        return NextResponse.json({
            user: { name: user.name, id: user.id, roles: user.roles },
            totalPending: instances.length,
            analysis
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
